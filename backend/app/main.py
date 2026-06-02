from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from sqlalchemy import inspect, text

from .database import Base, engine, SessionLocal
from .auth import seed_admin
from .routers import auth, employees, exams, proctors, rooms, fx


def _add_missing_columns():
    """Tiny migration helper — adds new columns to existing tables.
    Works for both SQLite and PostgreSQL. Idempotent."""
    inspector = inspect(engine)
    if not inspector.has_table("employees"):
        return
    cols = {c["name"] for c in inspector.get_columns("employees")}
    stmts = []
    if "department" not in cols:
        stmts.append("ALTER TABLE employees ADD COLUMN department VARCHAR DEFAULT ''")
    if "is_active" not in cols:
        # SQLite needs literal default; PostgreSQL also accepts BOOLEAN DEFAULT TRUE
        is_sqlite = engine.url.get_backend_name() == "sqlite"
        default = "1" if is_sqlite else "TRUE"
        col_type = "INTEGER" if is_sqlite else "BOOLEAN"
        stmts.append(f"ALTER TABLE employees ADD COLUMN is_active {col_type} NOT NULL DEFAULT {default}")
    if stmts:
        with engine.begin() as conn:
            for s in stmts:
                conn.execute(text(s))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _add_missing_columns()
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Деканат: Емтихан және прокторинг жүйесі", version="1.0.0", lifespan=lifespan)

import os
_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(exams.router)
app.include_router(proctors.router)
app.include_router(rooms.router)
app.include_router(fx.router)


@app.get("/")
def root():
    return {"app": "Деканат жүйесі", "docs": "/docs"}
