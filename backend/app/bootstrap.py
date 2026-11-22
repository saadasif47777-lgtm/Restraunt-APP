import argparse
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.db import engine
from app.modules.admin_workspace.models import Branch, Member, Restaurant

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    for arg in ["subject", "restaurant", "branch", "email"]:
        p.add_argument("--" + arg, required=True)
    args = p.parse_args()
    with Session(engine) as db, db.begin():
        subject = str(UUID(args.subject))
        existing = db.scalar(
            select(Member)
            .join(Branch, Member.branch == Branch.id)
            .join(Restaurant, Branch.restaurant == Restaurant.id)
            .where(
                Member.subject == subject,
                Member.role == "owner",
                Restaurant.name == args.restaurant,
                Branch.name == args.branch,
            )
        )
        if existing:
            raise SystemExit("Owner already configured for this branch.")
        r = Restaurant(name=args.restaurant)
        db.add(r)
        db.flush()
        b = Branch(restaurant=r.id, name=args.branch)
        db.add(b)
        db.flush()
        db.add(
            Member(
                subject=str(UUID(args.subject)),
                branch=b.id,
                role="owner",
                email=args.email,
            )
        )
