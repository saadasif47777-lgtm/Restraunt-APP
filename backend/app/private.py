"""Run only on loopback or behind a private network restriction."""

from app.main import make_app

app = make_app(private=True)
