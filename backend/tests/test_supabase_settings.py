import pytest
from app.core.supabase import admin_headers, project_url


@pytest.mark.parametrize(
    "key, bearer", [("sb_secret_example", False), ("legacy.test.jwt", True)]
)
def test_admin_key_headers(monkeypatch, key, bearer):
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", key)
    headers = admin_headers()
    assert headers["apikey"] == key
    assert headers.get("Authorization") == ("Bearer " + key if bearer else None)


def test_supabase_project_url_accepts_trailing_slash(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.invalid/")
    assert project_url() == "https://example.invalid"
