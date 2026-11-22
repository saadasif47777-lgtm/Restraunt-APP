from alembic import context
from app.core.db import engine
from app.modules.admin_workspace.models import Base

with engine.connect() as conn:
    context.configure(connection=conn, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
