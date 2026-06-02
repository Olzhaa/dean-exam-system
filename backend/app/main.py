from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import Base, engine, SessionLocal
from .auth import seed_admin
from .routers import auth, employees, exams, proctors, rooms, fx


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Деканат: Емтихан және прокторинг жүйесі", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
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
