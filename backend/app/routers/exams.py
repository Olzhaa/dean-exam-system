from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db
from ..auth import require_admin, get_current_user

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("", response_model=List[schemas.ExamOut])
def list_exams(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    return db.query(models.Exam).order_by(models.Exam.exam_date, models.Exam.exam_time).all()


@router.post("", response_model=schemas.ExamOut)
def create_exam(payload: schemas.ExamCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    exam = models.Exam(**payload.model_dump())
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


@router.delete("/{exam_id}")
def delete_exam(exam_id: int, db: Session = Depends(get_db), _user=Depends(require_admin)):
    exam = db.query(models.Exam).get(exam_id)
    if not exam:
        raise HTTPException(404, "Емтихан табылмады")
    # decrement proctor counts
    for a in exam.assignments:
        emp = a.employee
        if emp.current_proctor_count > 0:
            emp.current_proctor_count -= 1
    db.delete(exam)
    db.commit()
    return {"ok": True}
