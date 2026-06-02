import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import verify_password, hash_password, create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

# Simple in-memory rate limiter: max 5 failed attempts per IP per 5 minutes
_attempts: dict[str, list[float]] = defaultdict(list)
MAX_ATTEMPTS = 5
WINDOW_SEC = 300


def _check_rate_limit(ip: str):
    now = time.time()
    _attempts[ip] = [t for t in _attempts[ip] if now - t < WINDOW_SEC]
    if len(_attempts[ip]) >= MAX_ATTEMPTS:
        raise HTTPException(429, "Тым көп әрекет. 5 минуттан кейін көріңіз.")


def _record_failure(ip: str):
    _attempts[ip].append(time.time())


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        _record_failure(ip)
        raise HTTPException(status_code=401, detail="Қате логин немесе құпиясөз")
    _attempts.pop(ip, None)
    token = create_token(user.username, user.role)
    return schemas.TokenResponse(access_token=token, role=user.role, username=user.username)


@router.get("/me", response_model=schemas.TokenResponse)
def me(user: models.User = Depends(get_current_user)):
    token = create_token(user.username, user.role)
    return schemas.TokenResponse(access_token=token, role=user.role, username=user.username)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(
    payload: PasswordChange,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(400, "Қазіргі құпиясөз дұрыс емес")
    if len(payload.new_password) < 8:
        raise HTTPException(400, "Жаңа құпиясөз кемінде 8 таңбадан тұруы керек")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}
