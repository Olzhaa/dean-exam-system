from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import verify_password, create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Қате логин немесе құпиясөз")
    token = create_token(user.username, user.role)
    return schemas.TokenResponse(access_token=token, role=user.role, username=user.username)


@router.get("/me", response_model=schemas.TokenResponse)
def me(user: models.User = Depends(get_current_user)):
    token = create_token(user.username, user.role)
    return schemas.TokenResponse(access_token=token, role=user.role, username=user.username)
