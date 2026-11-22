"""Explicit tenant keys for the SQLite workspace."""

from alembic import op

revision = "003_test_workspace"
down_revision = "002_private"


def upgrade():
    for table, key in [
        ("branches", "restaurant"),
        ("dining_tables", "branch"),
        ("import_jobs", "branch"),
    ]:
        op.execute(f"ALTER TABLE {table} RENAME COLUMN {key} TO {key}_id")


def downgrade():
    for table, key in [
        ("branches", "restaurant"),
        ("dining_tables", "branch"),
        ("import_jobs", "branch"),
    ]:
        op.execute(f"ALTER TABLE {table} RENAME COLUMN {key}_id TO {key}")
