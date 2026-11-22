import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


url = make_url(os.environ["DATABASE_URL"])
if url.drivername in {"postgres", "postgresql"}:
    url = url.set(drivername="postgresql+psycopg")

# Reuse the external Supabase pool across short-lived Vercel instances.
options = {"poolclass": NullPool} if os.getenv("VERCEL") else {}
if url.drivername == "postgresql+psycopg":
    options["connect_args"] = {"prepare_threshold": None}
engine = create_engine(url, pool_pre_ping=True, **options)


def session():
    with Session(engine) as db:
        yield db
