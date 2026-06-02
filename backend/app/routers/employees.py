from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db
from ..auth import require_admin

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=List[schemas.EmployeeOut])
def list_employees(db: Session = Depends(get_db), _user=Depends(require_admin)):
    return db.query(models.Employee).order_by(models.Employee.name).all()


@router.post("", response_model=schemas.EmployeeOut)
def create_employee(payload: schemas.EmployeeCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    emp = models.Employee(**payload.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@router.put("/{emp_id}", response_model=schemas.EmployeeOut)
def update_employee(emp_id: int, payload: schemas.EmployeeUpdate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    emp = db.query(models.Employee).get(emp_id)
    if not emp:
        raise HTTPException(404, "Қызметкер табылмады")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(emp, k, v)
    db.commit()
    db.refresh(emp)
    return emp


@router.delete("/{emp_id}")
def delete_employee(emp_id: int, db: Session = Depends(get_db), _user=Depends(require_admin)):
    emp = db.query(models.Employee).get(emp_id)
    if not emp:
        raise HTTPException(404, "Қызметкер табылмады")
    db.delete(emp)
    db.commit()
    return {"ok": True}
