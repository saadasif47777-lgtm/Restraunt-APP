from uuid import uuid4
from sqlalchemy import String, ForeignKey, JSON, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


def uid():
    return str(uuid4())


class Restaurant(Base):
    __tablename__ = "restaurants"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    name: Mapped[str]


class Branch(Base):
    __tablename__ = "branches"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    restaurant: Mapped[str] = mapped_column(ForeignKey("restaurants.id"))
    name: Mapped[str]
    currency: Mapped[str] = mapped_column(default="PKR")
    hours: Mapped[str] = mapped_column(default="")
    stations: Mapped[list] = mapped_column(JSON, default=list)
    draft: Mapped[dict] = mapped_column(
        JSON, default=lambda: {"categories": [], "dishes": []}
    )
    revision: Mapped[int] = mapped_column(Integer, default=0)
    published: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class Member(Base):
    __tablename__ = "members"
    __table_args__ = (UniqueConstraint("subject", "branch"),)
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    subject: Mapped[str]
    branch: Mapped[str] = mapped_column(ForeignKey("branches.id"))
    role: Mapped[str]
    email: Mapped[str] = mapped_column(default="")


class DiningTable(Base):
    __tablename__ = "dining_tables"
    __table_args__ = (UniqueConstraint("branch", "label"),)
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    branch: Mapped[str] = mapped_column(ForeignKey("branches.id"))
    label: Mapped[str]


class ImportJob(Base):
    __tablename__ = "import_jobs"
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    branch: Mapped[str] = mapped_column(ForeignKey("branches.id"))
    sources: Mapped[list] = mapped_column(JSON)
    pages: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(default="queued")
    error: Mapped[str] = mapped_column(default="")
