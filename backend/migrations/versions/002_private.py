"""Deny direct Data API access. The server connects using a trusted database role."""
from alembic import op

revision = "002_private"
down_revision = "001_workspace"
tables = ["restaurants", "branches", "members", "dining_tables", "import_jobs"]

def upgrade():
    for table in tables:
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')

def downgrade():
    for table in tables:
        op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY')
