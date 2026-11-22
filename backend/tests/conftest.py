import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Keep imports and migrations isolated even when a developer has a local .env.
sandbox = tempfile.TemporaryDirectory(prefix="tablelane-tests-")
os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(sandbox.name) / "workspace.db")
os.environ["UPLOAD_DIR"] = str(Path(sandbox.name) / "uploads")
from app import bootstrap
from app.core.db import engine
from app.private import app
from app.modules.admin_workspace.models import Branch, Restaurant
from app.modules.admin_workspace.workspace import FIRST_BRANCH_ID


@pytest.fixture
def ctx(tmp_path, monkeypatch):
    from app.core import db as config
    from sqlalchemy import create_engine, event

    url = "sqlite:///" + str(tmp_path / "workspace.db")
    test_engine = create_engine(url)
    event.listen(test_engine, "connect", config.configure)
    monkeypatch.setattr(config, "engine", test_engine)
    monkeypatch.setattr(bootstrap, "engine", test_engine)
    for mod in [config, bootstrap]:
        monkeypatch.setattr(mod, "UPLOAD_DIR", tmp_path / "uploads")
    bootstrap.setup()
    with (
        TestClient(app, base_url="http://localhost") as client,
        Session(test_engine) as db,
    ):
        other = Restaurant(name="Other")
        db.add(other)
        db.flush()
        outside = Branch(name="Other", restaurant_id=other.id)
        db.add(outside)
        db.commit()
        yield client, db, (FIRST_BRANCH_ID, outside.id)
    test_engine.dispose()
