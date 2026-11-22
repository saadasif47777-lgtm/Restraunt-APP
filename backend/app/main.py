import os
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.modules.admin_workspace import menu_routes, menu_imports

app = FastAPI(title="Tablelane")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(","),
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Authorization", "Content-Type"],
)
routes = APIRouter()
routes.include_router(menu_routes.router)
routes.include_router(menu_imports.router)
app.include_router(routes)
app.include_router(routes, prefix="/api", include_in_schema=False)
