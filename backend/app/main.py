import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.modules.admin_workspace import menu_routes, menu_imports

app = FastAPI(title="Tablelane")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(","),
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(menu_routes.router)
app.include_router(menu_imports.router)
