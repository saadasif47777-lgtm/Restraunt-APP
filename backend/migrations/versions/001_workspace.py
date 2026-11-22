"""Initial branch workspace schema."""

from alembic import op
import sqlalchemy as sa

revision = "001_workspace"
down_revision = None


def primary_key():
    return sa.Column("id", sa.String(), primary_key=True)


def name(key):
    return sa.Column(key, sa.String(), nullable=False)


def branch_key():
    return sa.Column(
        "branch", sa.String(), sa.ForeignKey("branches.id"), nullable=False
    )


def upgrade():
    op.create_table("restaurants", primary_key(), name("name"))
    op.create_table(
        "branches",
        primary_key(),
        sa.Column(
            "restaurant", sa.String(), sa.ForeignKey("restaurants.id"), nullable=False
        ),
        name("name"),
        name("currency"),
        name("hours"),
        sa.Column("stations", sa.JSON(), nullable=False),
        sa.Column("draft", sa.JSON(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("published", sa.JSON(), nullable=True),
    )
    op.create_table(
        "members",
        primary_key(),
        branch_key(),
        name("subject"),
        name("role"),
        name("email"),
        sa.UniqueConstraint("subject", "branch"),
    )
    op.create_table(
        "dining_tables",
        primary_key(),
        branch_key(),
        name("label"),
        sa.UniqueConstraint("branch", "label"),
    )
    op.create_table(
        "import_jobs",
        primary_key(),
        branch_key(),
        sa.Column("sources", sa.JSON(), nullable=False),
        sa.Column("pages", sa.JSON(), nullable=False),
        name("status"),
        name("error"),
    )


def downgrade():
    for table in ["import_jobs", "dining_tables", "members", "branches", "restaurants"]:
        op.drop_table(table)
