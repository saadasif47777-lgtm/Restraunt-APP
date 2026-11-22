import os
from typing import Literal, Annotated
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, StringConstraints, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.auth import identity
from app.core.db import session
from .models import Branch, Member, Restaurant, DiningTable

router = APIRouter()
Db = Annotated[Session, Depends(session)]
User = Annotated[str, Depends(identity)]
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
    photo: str = Field(default="", pattern=r"^(https://|/food/|$)")
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


def authorize(db, user, branch, owner=False):
    member = db.scalar(
        select(Member).where(Member.subject == user, Member.branch == branch)
    )
    if not member or member.role not in (["owner"] if owner else ["owner", "manager"]):
        raise HTTPException(403, "Branch access denied")
    return member


def locked(db, branch, revision):
    b = db.get(Branch, branch, with_for_update=True)
    if b.revision != revision:
        raise HTTPException(409, "Draft changed. Reload before saving.")
    return b


@router.get("/branches")
def branches(db: Db, user: User):
    return [
        dict(
            id=b.id,
            name=b.name,
            restaurant=db.get(Restaurant, b.restaurant).name,
            role=m.role,
        )
        for b, m in db.execute(
            select(Branch, Member)
            .join(Member, Member.branch == Branch.id)
            .where(Member.subject == user, Member.role.in_(["owner", "manager"]))
        )
    ]


@router.post("/branches/{branch}/branches")
def add_branch(branch: str, data: Named, db: Db, user: User):
    authorize(db, user, branch, True)
    b = Branch(name=data.name, restaurant=db.get(Branch, branch).restaurant)
    db.add(b)
    db.flush()
    db.add(Member(subject=user, branch=b.id, role="owner"))
    db.commit()
    return {"id": b.id}


@router.get("/branches/{branch}")
def workspace(branch: str, db: Db, user: User):
    m = authorize(db, user, branch)
    b = db.get(Branch, branch)
    return dict(
        name=b.name,
        currency=b.currency,
        hours=b.hours,
        stations=b.stations,
        draft=b.draft,
        revision=b.revision,
        live=bool(b.published),
        role=m.role,
        tables=[
            dict(id=t.id, label=t.label)
            for t in db.scalars(select(DiningTable).where(DiningTable.branch == branch))
        ],
        staff=[
            dict(id=s.id, email=s.email, role=s.role)
            for s in db.scalars(select(Member).where(Member.branch == branch))
        ],
    )


@router.put("/branches/{branch}/settings")
def settings(branch: str, data: Settings, db: Db, user: User):
    authorize(db, user, branch)
    b = db.get(Branch, branch, with_for_update=True)
    for k, v in data.model_dump().items():
        setattr(b, k, v)
    db.commit()
    return {"saved": True}


@router.post("/branches/{branch}/tables")
def table(branch: str, data: Named, db: Db, user: User):
    authorize(db, user, branch)
    if db.scalar(
        select(DiningTable).where(
            DiningTable.branch == branch, DiningTable.label == data.name
        )
    ):
        raise HTTPException(409, "Table already exists")
    t = DiningTable(branch=branch, label=data.name)
    db.add(t)
    db.commit()
    return {"id": t.id, "label": t.label}


class Invitation(BaseModel):
    email: str = Field(pattern=r"^[^ @]+@[^ @]+\.[^ @]+$")
    role: Literal["manager", "waiter", "cook", "cashier"]


@router.post("/branches/{branch}/staff")
def invite(branch: str, data: Invitation, db: Db, user: User):
    authorize(db, user, branch, True)
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    r = httpx.post(
        os.environ["SUPABASE_URL"] + "/auth/v1/invite",
        headers={"apikey": key, "Authorization": "Bearer " + key},
        json={"email": data.email},
    )
    if r.is_error:
        raise HTTPException(422, "Invitation declined by authentication provider")
    db.add(
        Member(subject=r.json()["id"], role=data.role, email=data.email, branch=branch)
    )
    db.commit()
    return {"invited": True}


@router.put("/branches/{branch}/draft")
def save(branch: str, data: Edit, db: Db, user: User):
    authorize(db, user, branch)
    b = locked(db, branch, data.revision)
    b.draft = data.draft.model_dump()
    b.revision += 1
    db.commit()
    return {"revision": b.revision}


@router.post("/branches/{branch}/publish")
def publish(branch: str, data: Version, db: Db, user: User):
    authorize(db, user, branch)
    b = locked(db, branch, data.revision)
    menu = Draft.model_validate(b.draft)
    menu.dishes = [d for d in menu.dishes if not d.archived]
    if not menu.dishes or any(
        p.price is None
        for d in menu.dishes
        for p in [*d.portions, *[x for g in d.modifiers.values() for x in g]]
    ):
        raise HTTPException(422, "Review missing prices before publishing")
    b.published = {**menu.model_dump(), "currency": b.currency, "version": b.revision}
    db.commit()
    return {"version": b.revision}


@router.get("/menu/{table_id}")
def public_menu(table_id: str, db: Db):
    t = db.get(DiningTable, table_id)
    if not t:
        raise HTTPException(404, "Table not found")
    b = db.get(Branch, t.branch)
    if not b.published:
        raise HTTPException(404, "Menu has not been published")
    return {
        **b.published,
        "restaurant": db.get(Restaurant, b.restaurant).name,
        "branch": b.name,
        "table": t.label,
    }


class StaffRole(BaseModel):
    role: Literal["manager", "waiter", "cook", "cashier"]


@router.put("/branches/{branch}/staff/{member_id}")
def change_role(branch: str, member_id: str, data: StaffRole, db: Db, user: User):
    authorize(db, user, branch, True)
    member = db.scalar(
        select(Member)
        .where(Member.branch == branch, Member.id == member_id)
        .with_for_update()
    )
    if not member:
        raise HTTPException(404, "Staff member not found")
    if member.role == "owner":
        raise HTTPException(403, "Owner access is protected")
    member.role = data.role
    db.commit()
    return {"role": member.role}


@router.put("/branches/{branch}/restaurant")
def rename_restaurant(branch: str, data: Named, db: Db, user: User):
    authorize(db, user, branch, True)
    r = db.get(Restaurant, db.get(Branch, branch).restaurant)
    r.name = data.name
    db.commit()
    return {"name": r.name}
