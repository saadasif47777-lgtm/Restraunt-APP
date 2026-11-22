"""Loopback-only browser harness. Use a disposable PostgreSQL database ending in _test."""
import os
import time
import secrets
import asyncio
from contextlib import asynccontextmanager
from fastapi import Request,Response,HTTPException
from app.worker import work
from uuid import uuid4
from cryptography.hazmat.primitives.asymmetric import ec
import jwt
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.db import engine
from app.main import app as backend
from app.modules.admin_workspace.models import Restaurant, Branch, Member

if not engine.url.database.endswith("_test"):
    raise RuntimeError("Browser harness requires a disposable database ending in _test")
local="http://127.0.0.1:8011"
if os.environ.get("SUPABASE_URL")!=local:
    raise RuntimeError("Set SUPABASE_URL to the loopback test identity provider")
os.environ["SUPABASE_SERVICE_ROLE_KEY"]=secrets.token_urlsafe(32)
def tick():
    with Session(engine) as db: work(db)

@asynccontextmanager
async def lifespan(app):
    async def worker():
        while True:
            await asyncio.to_thread(tick)
            await asyncio.sleep(0.25)
    task=asyncio.create_task(worker())
    try: yield
    finally: task.cancel()

app=FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=["http://127.0.0.1:3011"],allow_headers=["*"],allow_methods=["*"])
key=ec.generate_private_key(ec.SECP256R1())
@app.get("/auth/v1/.well-known/jwks.json")
def jwks():
    return {"keys":[{**jwt.algorithms.ECAlgorithm.to_jwk(key.public_key(),as_dict=True),"kid":"test","alg":"ES256","use":"sig"}]}

@app.post("/auth/v1/token")
def login():
    subject=str(uuid4()); email="owner@example.invalid"
    with Session(engine) as db, db.begin():
        r=Restaurant(name="Browser Bistro");db.add(r);db.flush()
        b=Branch(name="Main",restaurant=r.id);db.add(b);db.flush()
        db.add(Member(subject=subject,branch=b.id,role="owner",email=email))
    now=int(time.time())
    token=jwt.encode({"sub":subject,"aud":"authenticated","iss":local+"/auth/v1","iat":now,"exp":now+3600},key,algorithm="ES256",headers={"kid":"test"})
    return {"access_token":token,"refresh_token":str(uuid4()),"token_type":"bearer","expires_in":3600,
            "user":{"id":subject,"email":email,"aud":"authenticated","app_metadata":{},"user_metadata":{},"created_at":"2026-01-01T00:00:00Z"}}
blobs={}
def private(req):
    if req.headers.get("apikey")!=os.environ["SUPABASE_SERVICE_ROLE_KEY"]:
        raise HTTPException(403)
@app.api_route("/storage/v1/object/{path:path}",methods=["GET","POST"])
async def storage(req:Request,path:str):
    private(req)
    if req.method=="POST": blobs[path]=await req.body()
    if path not in blobs:raise HTTPException(404)
    return Response(blobs[path])
@app.post("/auth/v1/invite")
def invite(req:Request):
    private(req)
    return {"id":str(uuid4())}
app.mount("/",backend)
