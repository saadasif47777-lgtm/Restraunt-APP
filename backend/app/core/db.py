import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session

class Base(DeclarativeBase):
    pass

engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)

def session():
    with Session(engine) as db:
        yield db
