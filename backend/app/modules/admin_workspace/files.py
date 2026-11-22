from pathlib import Path
from fastapi import HTTPException
from app.core import db
from .workspace import RESTAURANT_ID


def file_path(kind, branch, file_id):
    # Both components are opaque server-issued IDs. Never accept filenames or paths.
    if not all(
        s and s.isascii() and all(c.isalnum() or c == "-" for c in s)
        for s in (branch, file_id)
    ):
        raise HTTPException(404, "File not found")
    return db.UPLOAD_DIR / RESTAURANT_ID / branch / kind / file_id


def write_file(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as stream:
        try:
            stream.write(data)
        except OSError:
            stream.close()
            path.unlink(missing_ok=True)
            raise
