"""Migrate and seed the persistent test workspace. Run from backend."""

from alembic import command
from alembic.config import Config
from sqlalchemy.dialects.sqlite import insert
from app.core.db import ROOT, UPLOAD_DIR, engine
from app.modules.admin_workspace.models import Branch, Restaurant
from app.modules.admin_workspace.workspace import RESTAURANT_ID, FIRST_BRANCH_ID


def setup():
    config = Config(str(ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(ROOT / "migrations"))
    command.upgrade(config, "head")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    with engine.begin() as conn:
        conn.execute(
            insert(Restaurant)
            .values(id=RESTAURANT_ID, name="Test Restaurant")
            .on_conflict_do_nothing(index_elements=["id"])
        )
        conn.execute(
            insert(Branch)
            .values(id=FIRST_BRANCH_ID, restaurant_id=RESTAURANT_ID, name="Main")
            .on_conflict_do_nothing(index_elements=["id"])
        )


if __name__ == "__main__":
    setup()
