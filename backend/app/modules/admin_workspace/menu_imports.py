import io
import ipaddress
import os
import re
import socket
import time
from urllib.parse import urlsplit, urljoin
import pymupdf as fitz
import urllib3
import zxingcpp
from bs4 import BeautifulSoup
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Response
from google.cloud import vision
from google.api_core.exceptions import GoogleAPICallError, PermissionDenied, Unauthenticated
from google.auth.exceptions import GoogleAuthError
from PIL import Image
from sqlalchemy import select
from .files import file_path, write_file
from .workspace import active_branch
from .menu_routes import Db
from .models import ImportJob, uid

router = APIRouter(prefix="/branches/{branch}/imports")
LIMIT = 8 * 1024 * 1024
MAX_PAGES = 12


def fetch_public(url):
    deadline = time.monotonic() + 18
    for _ in range(4):
        if time.monotonic() > deadline:
            raise ValueError("Menu fetch timed out. Upload a screenshot.")
        target = urlsplit(url)
        if (
            target.scheme != "https"
            or not target.hostname
            or target.username
            or target.password
            or target.port not in (443, None)
        ):
            raise ValueError("Use a public HTTPS menu link or upload screenshots.")
        addresses = [
            r[4][0]
            for r in socket.getaddrinfo(target.hostname, 443, type=socket.SOCK_STREAM)
        ]
        if not addresses or any(
            not ipaddress.ip_address(ip).is_global for ip in addresses
        ):
            raise ValueError("Only public menu destinations are supported.")
        with urllib3.HTTPSConnectionPool(
            addresses[0],
            port=443,
            server_hostname=target.hostname,
            assert_hostname=target.hostname,
            cert_reqs="CERT_REQUIRED",
        ) as pool:
            r = pool.urlopen(
                "GET",
                (target.path or "/") + ("?" + target.query if target.query else ""),
                headers={"Host": target.hostname, "Accept-Encoding": "identity"},
                redirect=False,
                retries=False,
                preload_content=False,
                timeout=urllib3.Timeout(connect=4, read=5, total=12),
            )
            if r.status in (301, 302, 303, 307, 308):
                url = urljoin(url, r.headers.get("location", ""))
                continue
            if r.status != 200:
                raise ValueError(
                    "Menu unavailable or requires login. Upload screenshots instead."
                )
            body = bytearray()
            while len(body) <= LIMIT:
                chunk = r.read1(min(65536, LIMIT + 1 - len(body)), decode_content=False)
                if time.monotonic() > deadline:
                    raise ValueError("Menu fetch timed out. Upload a screenshot.")
                if not chunk:
                    break
                body.extend(chunk)
            if len(body) > LIMIT:
                raise ValueError("Menu exceeds 8 MB.")
            return bytes(body), r.headers.get("Content-Type", "")
    raise ValueError("Too many redirects. Upload screenshots instead.")


def kind(data):
    if data.startswith(b"%PDF-"):
        with fitz.open(stream=data, filetype="pdf") as pdf:
            if pdf.needs_pass or len(pdf) > MAX_PAGES:
                raise ValueError("Upload an unlocked PDF with at most 12 pages.")
        return "application/pdf"
    with Image.open(io.BytesIO(data)) as im:
        if (
            im.format not in ("JPEG", "PNG", "WEBP")
            or im.width * im.height > 20_000_000
        ):
            raise ValueError("Use JPEG, PNG or WebP up to 20 megapixels.")
        im.verify()
        return Image.MIME[im.format]


@router.post("")
def submit(
    branch: str,
    db: Db,
    files: list[UploadFile] = File(default=[]),
    url: str = Form(""),
    qr: bool = Form(False),
):
    active_branch(db, branch)
    if bool(files) == bool(url) or len(files) > MAX_PAGES:
        raise HTTPException(422, "Select up to 12 files or enter a menu link.")
    sources = []
    written = []
    count = 0
    try:
        for f in files:
            data = f.file.read(LIMIT + 1)
            if len(data) > LIMIT:
                raise ValueError("Each file must be under 8 MB.")
            mime = kind(data)
            if mime == "application/pdf":
                with fitz.open(stream=data, filetype="pdf") as pdf:
                    count += len(pdf)
            else:
                count += 1
            if count > MAX_PAGES:
                raise ValueError("Limit each import to 12 pages.")
            f.file.seek(0)
            sources.append(dict(branch=branch, file_id=uid(), mime=mime, qr=qr))
        for f, source in zip(files, sources):
            path = file_path("originals", branch, source["file_id"])
            data = f.file.read(LIMIT)
            write_file(path, data)
            written.append(path)

        if url:
            sources.append({"url": url})
        job = ImportJob(branch_id=branch, sources=sources)
        db.add(job)
        db.commit()
    except Exception as exc:
        db.rollback()
        for path in written:
            path.unlink(missing_ok=True)
        if isinstance(
            exc,
            (
                ValueError,
                Image.UnidentifiedImageError,
                RuntimeError,
                Image.DecompressionBombError,
            ),
        ):
            raise HTTPException(
                422,
                "Unreadable menu file."
                if isinstance(exc, Image.UnidentifiedImageError)
                else str(exc),
            ) from exc
        raise
    return {"id": job.id}


def check_job(branch, job_id, db):
    active_branch(db, branch)
    job = db.scalar(
        select(ImportJob).where(ImportJob.id == job_id, ImportJob.branch_id == branch)
    )
    if not job:
        raise HTTPException(404, "Import not found")
    return job


@router.get("")
def jobs(branch: str, db: Db):
    active_branch(db, branch)
    return [
        dict(
            id=j.id,
            status=j.status,
            error=j.error,
            pages=j.pages,
            sources=len(j.sources),
        )
        for j in db.scalars(select(ImportJob).where(ImportJob.branch_id == branch))
    ]


@router.get("/{job_id}/source/{index}")
def original(branch: str, job_id: str, index: int, db: Db):
    j = check_job(branch, job_id, db)
    if not 0 <= index < len(j.sources) or "file_id" not in j.sources[index]:
        raise HTTPException(404, "No uploaded original")
    s = j.sources[index]
    return Response(
        file_path("originals", branch, s["file_id"]).read_bytes(),
        media_type=s["mime"],
        headers={"Cache-Control": "private, no-store"},
    )


@router.post("/{job_id}/retry")
def retry(branch: str, job_id: str, db: Db):
    j = check_job(branch, job_id, db)
    if j.status != "failed":
        raise HTTPException(409, "Only failed imports can retry")
    j.status = "queued"
    j.error = ""
    db.commit()
    return {"queued": True}


def ocr(data):
    if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        raise ValueError(
            "Configure Google Cloud Vision credentials for scanned pages, or add dishes manually."
        )
    try:
        client = vision.ImageAnnotatorClient()
        result = client.document_text_detection(
            image=vision.Image(content=data), timeout=30
        )
    except (GoogleAuthError, PermissionDenied, Unauthenticated) as exc:
        raise ValueError(
            "Check the worker's Google Cloud Vision credentials and enable the Vision API, or add dishes manually."
        ) from exc
    except GoogleAPICallError as exc:
        raise ValueError(
            "Google Cloud Vision is unavailable. Check the provider, then retry this page or add dishes manually."
        ) from exc
    if result.error.message:
        raise ValueError(
            "Vision could not read this page. Retry or upload a clearer image."
        )
    annotation = result.full_text_annotation
    boxes = [
        {
            "text": "".join(s.text for s in w.symbols),
            "vertices": [[v.x, v.y] for v in w.bounding_box.vertices],
        }
        for page in annotation.pages
        for block in page.blocks
        for para in block.paragraphs
        for w in para.words
    ]
    return annotation.text, boxes


def pages(source, skip):
    url = source.get("url")
    data = b""
    if "file_id" in source:
        data = file_path("originals", source["branch"], source["file_id"]).read_bytes()
        if source.get("qr"):
            codes = zxingcpp.read_barcodes(Image.open(io.BytesIO(data)))
            if not codes:
                raise ValueError(
                    "QR unreadable. Paste the menu link or upload a screenshot."
                )
            url = codes[0].text
    if url:
        data, mime = fetch_public(url)
        if "html" in mime:
            soup = BeautifulSoup(data, "html.parser")
            if soup.select_one('input[type="password"]'):
                raise ValueError("This menu requires login. Upload a screenshot.")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            if 0 not in skip:
                yield 0, soup.get_text("\n", strip=True), []
            return
    mime = kind(data)
    if mime == "application/pdf":
        with fitz.open(stream=data, filetype="pdf") as doc:
            for i, page in enumerate(doc):
                if i in skip:
                    continue
                words = page.get_text("words")
                if words:
                    yield (
                        i,
                        page.get_text(sort=True),
                        [{"text": w[4], "box": list(w[:4])} for w in words],
                    )
                else:
                    if page.rect.width * page.rect.height > 5_000_000:
                        raise ValueError("Scanned page too large")
                    yield (
                        i,
                        *ocr(page.get_pixmap(matrix=fitz.Matrix(2, 2)).tobytes("png")),
                    )
    elif 0 not in skip:
        yield 0, *ocr(data)


def candidates(text, job, source, page):
    result = []
    for i, line in enumerate(text.splitlines()):
        line = line.strip()
        if not line or not any(c.isalpha() for c in line):
            continue
        match = re.fullmatch(
            r"(.+?)\s+(?:Rs\.?\s*|PKR\s*)?(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)",
            line,
            re.I,
        )
        if match and not re.search(r"\d", match[1]):
            name = match[1]
            price = float(match[2].replace(",", ""))
        else:
            name = line
            price = None
        result.append(dict(id=f"{job}-{source}-{page}-{i}", name=name, price=price))
    return result
