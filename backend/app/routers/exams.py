from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import io

from .. import models, schemas
from ..database import get_db
from ..auth import require_admin, get_current_user
from ..bs_format import import_bs_excel, export_bs_excel

router = APIRouter(prefix="/exams", tags=["exams"])


def _to_out(exam: models.Exam) -> schemas.ExamOut:
    return schemas.ExamOut(
        id=exam.id,
        course_code=exam.course_code,
        course_name=exam.course_name or "",
        program_name=exam.program_name or "",
        lecturer=exam.lecturer or "",
        course_year=exam.course_year or "",
        ects=exam.ects,
        student_count=exam.student_count or 0,
        exam_format=exam.exam_format or "",
        duration=exam.duration,
        room_number=exam.room_number,
        required_proctors=exam.required_proctors,
        exam_date=exam.exam_date,
        exam_time=exam.exam_time,
        rooms_list=exam.rooms_list,
    )


@router.get("", response_model=List[schemas.ExamOut])
def list_exams(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    rows = db.query(models.Exam).order_by(models.Exam.exam_date, models.Exam.exam_time).all()
    return [_to_out(e) for e in rows]


@router.post("", response_model=schemas.ExamOut)
def create_exam(payload: schemas.ExamCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    exam = models.Exam(**payload.model_dump())
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return _to_out(exam)


@router.delete("/{exam_id}")
def delete_exam(exam_id: int, db: Session = Depends(get_db), _user=Depends(require_admin)):
    exam = db.query(models.Exam).get(exam_id)
    if not exam:
        raise HTTPException(404, "Емтихан табылмады")
    for a in exam.assignments:
        emp = a.employee
        if emp.current_proctor_count > 0:
            emp.current_proctor_count -= 1
    db.delete(exam)
    db.commit()
    return {"ok": True}


@router.post("/import-bs", response_model=schemas.ExamImportResult)
async def import_bs(file: UploadFile = File(...), db: Session = Depends(get_db), _user=Depends(require_admin)):
    """Import SDU BS-format exam schedule Excel (header at row 9, data from row 10)."""
    content = await file.read()
    try:
        added, skipped, errors = import_bs_excel(db, content)
    except Exception as e:
        raise HTTPException(400, f"Файлды оқу қатесі: {e}")
    return schemas.ExamImportResult(added=added, skipped=skipped, errors=errors)


@router.get("/export-bs")
def export_bs(db: Session = Depends(get_db), _user=Depends(require_admin)):
    """Export exams + proctor assignments in SDU BS format."""
    data = export_bs_excel(db)
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=exam_schedule_with_proctors.xlsx"},
    )
