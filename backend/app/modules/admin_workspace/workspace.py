import os
import ipaddress
from urllib.parse import urlsplit
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


def guest_origin():
    """Only print a QR for an explicitly configured guest host."""

    value = os.getenv("PUBLIC_MENU_BASE_URL", "").strip().rstrip("/")
    try:
        url = urlsplit(value)
        host = url.hostname
        if url.port == 0:
            return ""
        if (
            url.scheme not in {"https", "http"}
            or not host
            or url.username
            or url.password
            or url.query
            or url.fragment
            or url.path
        ):
            return ""
        if host == "localhost" or host.endswith(".localhost"):
            return ""
        try:
            address = ipaddress.ip_address(host)
        except ValueError:
            return value
        return "" if address.is_loopback or address.is_unspecified else value
    except ValueError:
        return ""
