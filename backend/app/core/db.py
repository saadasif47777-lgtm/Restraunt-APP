import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Request
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")
url = make_url(os.getenv("DATABASE_URL", "sqlite:///./data/tablelane.db"))
if url.get_backend_name() != "sqlite" or not url.database or url.database == ":memory:":
    raise ValueError("DATABASE_URL must point to a persistent SQLite file")
database = (ROOT / url.database).resolve()
database.parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(url.set(database=str(database)), connect_args={"timeout": 15})
UPLOAD_DIR = (ROOT / os.getenv("UPLOAD_DIR", "./data/uploads")).resolve()


@event.listens_for(engine, "connect")
def configure(connection, record):
    connection.execute("PRAGMA foreign_keys=ON")


class Base(DeclarativeBase):
    pass


def session(request: Request):
    with Session(engine) as db:
        if request.method in {"PUT", "POST", "DELETE", "PATCH"}:
            # Serialize the revision check and mutation, including publication.
            db.execute(text("BEGIN IMMEDIATE"))
        yield db
