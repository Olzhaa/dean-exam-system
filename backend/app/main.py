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
    is_sqlite = engine.url.get_backend_name() == "sqlite"
    bool_type = "INTEGER" if is_sqlite else "BOOLEAN"
    bool_true = "1" if is_sqlite else "TRUE"
    stmts = []

    if inspector.has_table("employees"):
        cols = {c["name"] for c in inspector.get_columns("employees")}
        if "department" not in cols:
            stmts.append("ALTER TABLE employees ADD COLUMN department VARCHAR DEFAULT ''")
        if "is_active" not in cols:
            stmts.append(f"ALTER TABLE employees ADD COLUMN is_active {bool_type} NOT NULL DEFAULT {bool_true}")

    if inspector.has_table("exams"):
        cols = {c["name"] for c in inspector.get_columns("exams")}
        new_text_cols = [
            ("course_name", "VARCHAR DEFAULT ''"),
            ("program_name", "VARCHAR DEFAULT ''"),
            ("lecturer", "VARCHAR DEFAULT ''"),
            ("course_year", "VARCHAR DEFAULT ''"),
            ("exam_format", "VARCHAR DEFAULT ''"),
        ]
        for name, decl in new_text_cols:
            if name not in cols:
                stmts.append(f"ALTER TABLE exams ADD COLUMN {name} {decl}")
        if "ects" not in cols:
            stmts.append("ALTER TABLE exams ADD COLUMN ects INTEGER")
        if "student_count" not in cols:
            stmts.append("ALTER TABLE exams ADD COLUMN student_count INTEGER DEFAULT 0")

    if inspector.has_table("proctor_assignments"):
        cols = {c["name"] for c in inspector.get_columns("proctor_assignments")}
        if "room" not in cols:
            stmts.append("ALTER TABLE proctor_assignments ADD COLUMN room VARCHAR DEFAULT ''")

    if inspector.has_table("fx_requests"):
        cols = {c["name"] for c in inspector.get_columns("fx_requests")}
        for name in ["course_title", "instructor", "section", "faculty", "cipher", "speciality", "course_year"]:
            if name not in cols:
                stmts.append(f"ALTER TABLE fx_requests ADD COLUMN {name} VARCHAR DEFAULT ''")
        if "ects" not in cols:
            stmts.append("ALTER TABLE fx_requests ADD COLUMN ects INTEGER")

    if inspector.has_table("fx_exams"):
        cols = {c["name"] for c in inspector.get_columns("fx_exams")}
        for name in ["course_name", "instructor", "section", "program_name", "course_year", "exam_format"]:
            if name not in cols:
                stmts.append(f"ALTER TABLE fx_exams ADD COLUMN {name} VARCHAR DEFAULT ''")
        if "ects" not in cols:
            stmts.append("ALTER TABLE fx_exams ADD COLUMN ects INTEGER")

    if stmts:
        with engine.begin() as conn:
            for s in stmts:
                conn.execute(text(s))


@asynccontextmanager
async def lifespan(app: FastAPI):
    backend = engine.url.get_backend_name()
    host = engine.url.host or "local"
    print(f"[startup] DB backend: {backend}, host: {host}")
    if backend == "sqlite":
        print("[startup] ⚠️  Using SQLite — data will be lost on redeploy! Set DATABASE_URL env var.")
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


@app.get("/health")
def health():
    backend = engine.url.get_backend_name()
    return {
        "ok": True,
        "db_backend": backend,
        "persistent": backend != "sqlite",
        "warning": "SQLite ephemeral — data resets on redeploy" if backend == "sqlite" else None,
    }
