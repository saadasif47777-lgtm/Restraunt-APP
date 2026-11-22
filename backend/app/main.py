"""Default/public entrypoint exposes only published content."""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.modules.admin_workspace.menu_routes import public_router


def make_app(*, private=False):
    app = FastAPI(title="Tablelane", docs_url=None, redoc_url=None, openapi_url=None)
    origins = [
        s.strip().rstrip("/")
        for s in os.getenv(
            "FRONTEND_ORIGIN", "http://127.0.0.1:3000,http://localhost:3000"
        ).split(",")
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["GET", "POST", "PUT"] if private else ["GET"],
        allow_headers=["Content-Type"],
    )
    routers = [public_router]
    if private:
        from starlette.middleware.trustedhost import TrustedHostMiddleware
        from fastapi.responses import JSONResponse
        from app.modules.admin_workspace import menu_imports, menu_routes

        routers.extend([menu_routes.router, menu_imports.router])
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=os.getenv("ADMIN_HOSTS", "localhost,127.0.0.1").split(","),
        )

        @app.middleware("http")
        async def protect_private_origin(request, call_next):
            origin = request.headers.get("origin")
            if (
                request.method not in {"GET", "HEAD", "OPTIONS"}
                and origin
                and origin.rstrip("/") not in origins
            ):
                return JSONResponse(
                    {"detail": "Private workspace origin required"}, status_code=403
                )
            return await call_next(request)

    for router in routers:
        app.include_router(router, prefix="/api")
        app.include_router(router, include_in_schema=False)
    return app


app = make_app()
