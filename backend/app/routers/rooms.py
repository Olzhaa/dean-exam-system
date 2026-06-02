from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db
from ..auth import require_admin

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("", response_model=List[schemas.RoomOut])
def list_rooms(db: Session = Depends(get_db), _user=Depends(require_admin)):
    return db.query(models.Room).order_by(models.Room.room_number).all()


@router.post("", response_model=schemas.RoomOut)
def create_room(payload: schemas.RoomCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    if db.query(models.Room).filter(models.Room.room_number == payload.room_number).first():
        raise HTTPException(400, "Бұл кабинет нөмірі бар")
    room = models.Room(**payload.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.delete("/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db), _user=Depends(require_admin)):
    room = db.query(models.Room).get(room_id)
    if not room:
        raise HTTPException(404, "Кабинет табылмады")
    db.delete(room)
    db.commit()
    return {"ok": True}
