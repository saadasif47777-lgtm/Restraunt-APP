from fastapi import HTTPException
from sqlalchemy import select
from .models import Branch

RESTAURANT_ID = "test-restaurant"
FIRST_BRANCH_ID = "test-branch"


def active_branch(db, branch_id):
    branch = db.scalar(
        select(Branch).where(
            Branch.id == branch_id, Branch.restaurant_id == RESTAURANT_ID
        )
    )
    if branch is None:
        raise HTTPException(404, "Branch not found in the test workspace")
    return branch
