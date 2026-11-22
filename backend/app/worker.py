import time
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.db import engine
from app.modules.admin_workspace.models import ImportJob
from app.modules.admin_workspace.menu_imports import pages,candidates

def work(db):
    j=db.scalar(select(ImportJob).where(ImportJob.status.in_(["queued","processing"])).order_by(ImportJob.id).limit(1))
    if not j:return False
    j.status="processing";db.commit()
    try:
        for s,source in enumerate(j.sources):
            skip={p["page"] for p in j.pages if p["source"]==s}
            for n,text,boxes in pages(source,skip):
                rows=candidates(text,j.id,s,n)
                if not rows:raise ValueError("No readable dishes. Upload a clearer screenshot.")
                j.pages=[*j.pages,dict(source=s,page=n,text=text,boxes=boxes,rows=rows)]
                db.commit()
        j.status="review"
    except Exception as e:
        j.status="failed";j.error=str(e) if isinstance(e,ValueError) else "Could not read the source. Check the file or link, then retry."
    db.commit();return True

if __name__=="__main__":
    while True:
        with Session(engine) as db:
            if not work(db):time.sleep(2)
