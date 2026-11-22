from alembic import op
from app.modules.admin_workspace.models import Base

revision = "001_workspace"
down_revision = None


def upgrade():
    Base.metadata.create_all(op.get_bind())


def downgrade():
    Base.metadata.drop_all(op.get_bind())
