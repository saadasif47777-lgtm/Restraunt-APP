from typing import Annotated
import os
import io
from uuid import UUID
from PIL import Image, ImageOps
from fastapi import UploadFile
from fastapi.responses import FileResponse
from .files import file_path, write_file
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, StringConstraints, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from .workspace import RESTAURANT_ID, active_branch
from app.core.db import session
from .models import Branch, Restaurant, DiningTable, uid

router = APIRouter()
Db = Annotated[Session, Depends(session)]
public_router = APIRouter()
Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)
]
Money = Annotated[
    float, Field(ge=0, le=100000000, allow_inf_nan=False, multiple_of=0.01)
]


class Named(BaseModel):
    name: Name


class Portion(Named):
    price: Money | None


class Dish(Named):
    id: Name
    category: Name
    description: str = ""
    photo: str = Field(default="", pattern=r"^(|/images/[a-zA-Z0-9-]+/[a-f0-9-]{36})$")
    station: str = ""
    portions: list[Portion] = Field(min_length=1)
    modifiers: dict[str, list[Portion]] = {}
    deal: str = ""
    spice: str = ""
    allergens: list[str] = []
    import_rows: list[str] = []
    available: bool = True
    archived: bool = False


class Draft(BaseModel):
    categories: list[Name]
    dishes: list[Dish]

    @model_validator(mode="after")
    def consistent(self):
        ids = [dish.id for dish in self.dishes]
        if len(set(ids)) != len(ids) or len(set(self.categories)) != len(
            self.categories
        ):
            raise ValueError("Duplicate category or dish ID")
        if any(
            not d.archived and d.category not in self.categories for d in self.dishes
        ):
            raise ValueError("Choose an existing category")
        return self


class Edit(BaseModel):
    revision: int
    draft: Draft


class Version(BaseModel):
    revision: int


class Settings(Named):
    currency: str = Field(pattern="^[A-Z]{3}$")
    hours: str = ""
    stations: list[Name] = []


def locked(db, branch, revision):
    b = active_branch(db, branch)
    if b.revision != revision:
        raise HTTPException(409, "Draft changed. Reload before saving.")
    return b


@router.get("/branches")
def branches(db: Db):
    restaurant = db.get(Restaurant, RESTAURANT_ID)
    if not restaurant:
        raise HTTPException(
            503, "Run python -m app.bootstrap to initialize the test workspace."
        )
    return [
        dict(id=b.id, name=b.name, restaurant=restaurant.name)
        for b in db.scalars(
            select(Branch)
            .where(Branch.restaurant_id == RESTAURANT_ID)
            .order_by(Branch.name, Branch.id)
        )
    ]


@router.post("/branches/{branch}/branches")
def add_branch(branch: str, data: Named, db: Db):
    active_branch(db, branch)
    b = Branch(name=data.name, restaurant_id=RESTAURANT_ID)
    db.add(b)
    db.commit()
    return {"id": b.id}


@router.get("/branches/{branch}")
def workspace(branch: str, db: Db):
    b = active_branch(db, branch)
    return dict(
        name=b.name,
        currency=b.currency,
        hours=b.hours,
        stations=b.stations,
        draft=b.draft,
        revision=b.revision,
        live=bool(b.published),
        public_menu_base_url=os.getenv("PUBLIC_MENU_BASE_URL", "").strip().rstrip("/"),
        tables=[
            dict(id=t.id, label=t.label)
            for t in db.scalars(
                select(DiningTable).where(DiningTable.branch_id == branch)
            )
        ],
    )


@router.put("/branches/{branch}/settings")
def settings(branch: str, data: Settings, db: Db):
    b = active_branch(db, branch)
    for k, v in data.model_dump().items():
        setattr(b, k, v)
    db.commit()
    return {"saved": True}


@router.post("/branches/{branch}/tables")
def table(branch: str, data: Named, db: Db):
    active_branch(db, branch)
    if db.scalar(
        select(DiningTable).where(
            DiningTable.branch_id == branch, DiningTable.label == data.name
        )
    ):
        raise HTTPException(409, "Table already exists")
    t = DiningTable(branch_id=branch, label=data.name)
    db.add(t)
    db.commit()
    return {"id": t.id, "label": t.label}


@router.put("/branches/{branch}/draft")
def save(branch: str, data: Edit, db: Db):
    b = locked(db, branch, data.revision)
    for dish in data.draft.dishes:
        if dish.photo:
            _, _, photo_branch, image_id = dish.photo.split("/")
            if (
                photo_branch != branch
                or not file_path("photos", branch, image_id).is_file()
            ):
                raise HTTPException(422, "Choose a dish photo from this branch.")
    b.draft = data.draft.model_dump()
    b.revision += 1
    db.commit()
    return {"revision": b.revision}


@router.post("/branches/{branch}/publish")
def publish(branch: str, data: Version, db: Db):
    b = locked(db, branch, data.revision)
    menu = Draft.model_validate(b.draft)
    menu.dishes = [d for d in menu.dishes if not d.archived]
    if not menu.dishes or any(
        p.price is None
        for d in menu.dishes
        for p in [*d.portions, *[x for g in d.modifiers.values() for x in g]]
    ):
        raise HTTPException(422, "Review missing prices before publishing")
    b.published = {
        **menu.model_dump(
            exclude={"dishes": {"__all__": {"import_rows", "station", "archived"}}}
        ),
        "currency": b.currency,
        "version": b.revision,
    }
    db.commit()
    return {"version": b.revision}


@public_router.get("/menu/{table_id}")
def public_menu(table_id: str, db: Db):
    t = db.get(DiningTable, table_id)
    if not t:
        raise HTTPException(404, "Table not found")
    b = db.get(Branch, t.branch_id)
    if not b.published:
        raise HTTPException(404, "Menu has not been published")
    return {
        **b.published,
        "restaurant": db.get(Restaurant, b.restaurant_id).name,
        "branch": b.name,
        "table": t.label,
    }


@router.put("/branches/{branch}/restaurant")
def rename_restaurant(branch: str, data: Named, db: Db):
    active_branch(db, branch)
    r = db.get(Restaurant, RESTAURANT_ID)
    r.name = data.name
    db.commit()
    return {"name": r.name}


@router.post("/branches/{branch}/photos")
def upload_photo(branch: str, file: UploadFile, db: Db):
    active_branch(db, branch)
    data = file.file.read(8 * 1024 * 1024 + 1)
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, "Dish photos must be under 8 MB.")
    try:
        with Image.open(io.BytesIO(data)) as original:
            if (
                original.format not in {"JPEG", "PNG", "WEBP"}
                or original.width * original.height > 20_000_000
            ):
                raise ValueError()
            photo = ImageOps.exif_transpose(original).convert("RGB")
            photo.thumbnail((1200, 1200))
            output = io.BytesIO()
            photo.save(output, format="JPEG", quality=85)
    except (ValueError, OSError, Image.DecompressionBombError):
        raise HTTPException(
            422, "Choose a JPEG, PNG or WebP dish photo under 20 megapixels."
        )
    image_id = uid()
    write_file(file_path("photos", branch, image_id), output.getvalue())
    return {"photo": f"/images/{branch}/{image_id}"}


@router.get("/branches/{branch}/photos/{image_id}")
def private_photo(branch: str, image_id: UUID, db: Db):
    active_branch(db, branch)
    path = file_path("photos", branch, str(image_id))
    if not path.is_file():
        raise HTTPException(404, "Photo not found")
    return FileResponse(
        path, media_type="image/jpeg", headers={"Cache-Control": "private, no-store"}
    )


@public_router.get("/images/{branch}/{image_id}")
def published_photo(branch: str, image_id: UUID, db: Db):
    b = db.get(Branch, branch)
    reference = f"/images/{branch}/{image_id}"
    if (
        not b
        or not b.published
        or not any(d.get("photo") == reference for d in b.published["dishes"])
    ):
        raise HTTPException(404, "Photo not published")
    path = file_path("photos", branch, str(image_id))
    if not path.is_file():
        raise HTTPException(404, "Photo not found")
    return FileResponse(
        path, media_type="image/jpeg", headers={"Cache-Control": "no-store"}
    )
