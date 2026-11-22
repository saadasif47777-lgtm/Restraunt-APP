import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.db import engine,session
from app.core.auth import identity
from app.main import app
from app.modules.admin_workspace.models import Restaurant,Branch,Member

@pytest.fixture
def ctx(monkeypatch):
    assert engine.dialect.name=="postgresql"
    with engine.connect() as conn:
        tx=conn.begin()
        with Session(bind=conn,join_transaction_mode="create_savepoint") as db:
            ids=[]
            for name in ["A","B"]:
                r=Restaurant(name=name);db.add(r);db.flush()
                b=Branch(restaurant=r.id,name=name);db.add(b);db.flush()
                db.add(Member(subject="owner"+name,branch=b.id,role="owner"));ids.append(b.id)
            db.add(Member(subject="manager",branch=ids[0],role="manager"));db.commit()
            subject=["ownerA"]
            app.dependency_overrides[session]=lambda:db
            app.dependency_overrides[identity]=lambda:subject[0]
            try:
                with TestClient(app) as client: yield client,db,ids,subject
            finally:
                app.dependency_overrides.clear();tx.rollback()
