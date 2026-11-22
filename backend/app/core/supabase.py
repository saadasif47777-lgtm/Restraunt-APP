import os


def project_url() -> str:
    return os.environ["SUPABASE_URL"].strip().rstrip("/")


def admin_headers() -> dict[str, str]:
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not key:
        raise ValueError(
            "Configure the server-side Supabase secret or service-role key."
        )
    headers = {"apikey": key}
    # Legacy service-role keys are JWTs. New sb_secret_ keys use the API key header.
    if not key.startswith("sb_secret_"):
        headers["Authorization"] = "Bearer " + key
    return headers
