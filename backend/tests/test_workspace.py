import io
import pymupdf as fitz
import pytest
from PIL import Image
import zxingcpp
from app.modules.admin_workspace import menu_imports as imports
from app.worker import work


def test_publish_and_isolation(ctx, monkeypatch):
    c, db, (a, b) = ctx
    base = "/branches/" + a
    for method, suffix, payload in [
        ("get", "", None),
        ("get", "/imports", None),
        ("post", "/tables", {"name": "Table 5"}),
        ("post", "/staff", {"email": "sample@example.org", "role": "waiter"}),
        ("put", "/draft", {"revision": 0, "draft": {"categories": [], "dishes": []}}),
    ]:
        assert (
            c.request(method, "/branches/" + b + suffix, json=payload).status_code
            == 404
        )
    assert c.post(base + "/branches", json={"name": "Cantt"}).status_code == 200
    assert c.put(
        base + "/settings",
        json={"name": "Gulberg", "stations": ["Curry"], "currency": "PKR"},
    ).is_success
    t = c.post(base + "/tables", json={"name": "Table 5"}).json()["id"]
    public = "/menu/" + t
    draft = {
        "categories": ["Mains"],
        "dishes": [
            {
                "id": "k",
                "name": "Chicken Karahi",
                "category": "Mains",
                "station": "Curry",
                "portions": [
                    {"name": "Half", "price": 950},
                    {"name": "Full", "price": 1700},
                ],
                "modifiers": {"Extras": [{"name": "Extra ginger", "price": 50}]},
            }
        ],
    }

    def save(rev):
        return c.put(base + "/draft", json={"revision": rev, "draft": draft})

    assert save(0).json()["revision"] == 1
    assert save(0).status_code == 409
    assert c.get(public).status_code == 404
    assert c.post(base + "/publish", json={"revision": 1}).is_success
    assert c.get(public).json()["table"] == "Table 5"
    draft["dishes"][0]["portions"][0]["price"] = 990
    assert save(1).is_success
    assert c.get(public).json()["dishes"][0]["portions"][0]["price"] == 950
    assert c.post(base + "/publish", json={"revision": 2}).is_success
    draft["dishes"][0]["portions"][0]["price"] = None
    assert save(2).is_success
    assert c.post(base + "/publish", json={"revision": 3}).status_code == 422
    assert c.get(public).json()["dishes"][0]["portions"][0]["price"] == 990


def png(image):
    out = io.BytesIO()
    image.save(out, format="PNG")
    return out.getvalue()


@pytest.mark.parametrize("source", ["photo", "text pdf", "scan", "qr"])
def test_import_sources(ctx, source, monkeypatch):
    c, db, (a, b) = ctx
    text = "Chicken Karahi 950\nکباب"
    monkeypatch.setattr(imports, "ocr", lambda data: (text, []))
    image = png(Image.new("RGB", (100, 100), "white"))
    data = image
    if source in ("scan", "text pdf"):
        with fitz.open() as pdf:
            page = pdf.new_page()
            if source == "scan":
                page.insert_image(page.rect, stream=image)
            else:
                page.insert_text((40, 40), "Chicken Karahi 950\nUnclear dish")
            data = pdf.tobytes()
    if source == "qr":
        barcode = zxingcpp.create_barcode(
            "https://example.org/menu", zxingcpp.BarcodeFormat.QRCode
        )
        data = png(Image.fromarray(zxingcpp.write_barcode_to_image(barcode, scale=5)))
        monkeypatch.setattr(
            imports,
            "fetch_public",
            lambda url: (b"<p>Chicken Karahi 950</p><p>Unclear dish</p>", "text/html"),
        )
    base = "/branches/" + a + "/imports"
    result = c.post(base, files={"files": ("menu", data)}, data={"qr": source == "qr"})
    assert result.is_success, result.text
    jid = result.json()["id"]
    assert work(db)
    job = c.get(base).json()[0]
    assert job["status"] == "review", job
    rows = job["pages"][0]["rows"]
    assert rows[0]["price"] == 950 and rows[1]["price"] is None
    assert c.get(base + "/" + jid + "/source/0").content == data
    assert c.get("/branches/" + b + "/imports/" + jid + "/source/0").status_code == 404


def test_resume(ctx, monkeypatch):
    c, db, (a, b) = ctx
    data = png(Image.new("RGB", (40, 40)))
    calls = []

    def ocr(data):
        calls.append(1)
        if len(calls) == 2:
            raise ValueError("Test provider unavailable")
        return "Dish 100", []

    monkeypatch.setattr(imports, "ocr", ocr)
    base = "/branches/" + a + "/imports"
    j = c.post(
        base, files=[("files", ("a.png", data)), ("files", ("b.png", data))]
    ).json()["id"]
    work(db)
    assert c.get(base).json()[0]["status"] == "failed"
    assert c.post(base + "/" + j + "/retry").is_success
    work(db)
    pages = c.get(base).json()[0]["pages"]
    assert (
        len(pages) == 2
        and len(calls) == 3
        and pages[0]["rows"][0]["id"] != pages[1]["rows"][0]["id"]
    )


def test_invalid_uploads_and_roles(ctx):
    c, db, (a, b) = ctx
    base = "/branches/" + a
    assert (
        c.post(
            base + "/imports", files={"files": ("bad.jpg", b"not an image")}
        ).status_code
        == 422
    )
    assert c.post(base + "/tables", json={"name": "  "}).status_code == 422
    assert c.post(base + "/imports", data={"qr": "false"}).status_code == 422
    assert c.get(base + "/staff").status_code == 404
    assert (
        c.post(
            base + "/tables",
            json={"name": "forbidden"},
            headers={"Origin": "https://outside.invalid"},
        ).status_code
        == 403
    )


def test_published_files_persist_and_public_surface_is_read_only(ctx):
    from fastapi.testclient import TestClient
    from app.main import app as public
    from app.bootstrap import setup

    admin, db, (branch, other) = ctx
    base = "/branches/" + branch
    data = png(Image.new("RGB", (32, 32), "orange"))
    image = admin.post(base + "/photos", files={"file": ("dish.png", data)}).json()[
        "photo"
    ]
    original = admin.post(
        base + "/imports", files={"files": ("private.png", data)}
    ).json()["id"]
    table = admin.post(base + "/tables", json={"name": "Table 5"}).json()["id"]
    draft = {
        "categories": ["Mains"],
        "dishes": [
            {
                "id": "k",
                "name": "Karahi",
                "category": "Mains",
                "photo": image,
                "portions": [{"name": "Half", "price": 950}],
            }
        ],
    }
    with TestClient(public) as guest:
        assert guest.get(image).status_code == 404
        assert admin.put(
            base + "/draft", json={"revision": 0, "draft": draft}
        ).is_success
        assert guest.get("/menu/" + table).status_code == 404
        assert admin.post(base + "/publish", json={"revision": 1}).is_success
        assert guest.get(image).headers["content-type"] == "image/jpeg"
        for prefix in ("", "/api"):
            assert guest.get(prefix + base).status_code == 404
            assert (
                guest.get(
                    prefix + base + "/imports/" + original + "/source/0"
                ).status_code
                == 404
            )
            assert (
                guest.post(prefix + base + "/publish", json={"revision": 1}).status_code
                == 404
            )
            assert (
                guest.put(
                    prefix + base + "/draft", json={"revision": 1, "draft": draft}
                ).status_code
                == 404
            )
            assert guest.post(prefix + "/menu/" + table).status_code == 405
        setup()
        assert len(admin.get("/branches").json()) == 1
        assert admin.get(base + "/imports/" + original + "/source/0").content == data
        assert (
            guest.get("/menu/" + table).json()["dishes"][0]["portions"][0]["price"]
            == 950
        )
        draft["dishes"][0]["photo"] = ""
        assert admin.put(
            base + "/draft", json={"revision": 1, "draft": draft}
        ).is_success
        assert guest.get(image).status_code == 200
        assert admin.post(base + "/publish", json={"revision": 2}).is_success
        assert guest.get(image).status_code == 404


def test_ocr_setup_message(ctx, monkeypatch):
    c, db, (branch, _) = ctx
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)
    path = "/branches/" + branch + "/imports"
    assert c.post(
        path, files={"files": ("scan.png", png(Image.new("RGB", (10, 10))))}
    ).is_success
    work(db)
    job = c.get(path).json()[0]
    assert (
        job["status"] == "failed" and "Google Cloud Vision credentials" in job["error"]
    )
