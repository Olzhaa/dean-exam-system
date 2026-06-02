from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import pandas as pd

from .. import models, schemas
from ..database import get_db
from ..auth import require_admin, get_current_user
from ..algorithms.fx_scheduler import generate_schedule
from ..fx_format import import_fx_excel, export_fx_excel

router = APIRouter(prefix="/fx", tags=["fx"])


# ===== Students & requests =====
@router.get("/students", response_model=List[schemas.StudentOut])
def list_students(db: Session = Depends(get_db), _user=Depends(require_admin)):
    return db.query(models.Student).order_by(models.Student.name).all()


@router.get("/requests")
def list_requests(db: Session = Depends(get_db), _user=Depends(require_admin)):
    rows = db.query(models.FxRequest).join(models.Student).all()
    return [
        {
            "id": r.id,
            "student_id": r.student_id,
            "student_code": r.student.student_code,
            "student_name": r.student.name,
            "course_code": r.course_code,
        }
        for r in rows
    ]


@router.post("/requests")
def add_request(payload: schemas.FxRequestCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    student = db.query(models.Student).filter(models.Student.student_code == payload.student_code).first()
    if not student:
        student = models.Student(student_code=payload.student_code, name=payload.student_name)
        db.add(student)
        db.flush()
    exists = (
        db.query(models.FxRequest)
        .filter(models.FxRequest.student_id == student.id, models.FxRequest.course_code == payload.course_code)
        .first()
    )
    if exists:
        raise HTTPException(400, "Бұл өтініш бұрыннан бар")
    req = models.FxRequest(student_id=student.id, course_code=payload.course_code)
    db.add(req)
    db.commit()
    return {"ok": True, "id": req.id}


@router.delete("/requests/{req_id}")
def delete_request(req_id: int, db: Session = Depends(get_db), _user=Depends(require_admin)):
    r = db.query(models.FxRequest).get(req_id)
    if not r:
        raise HTTPException(404, "Өтініш табылмады")
    db.delete(r)
    db.commit()
    return {"ok": True}


@router.post("/requests/import")
async def import_requests(file: UploadFile = File(...), db: Session = Depends(get_db), _user=Depends(require_admin)):
    """Excel/CSV columns expected: student_code, student_name, course_code"""
    content = await file.read()
    name = (file.filename or "").lower()
    try:
        if name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Файл оқылмады: {e}")

    required = {"student_code", "student_name", "course_code"}
    if not required.issubset({c.lower() for c in df.columns}):
        raise HTTPException(400, f"Бағандар керек: {', '.join(required)}")

    df.columns = [c.lower() for c in df.columns]
    added = 0
    skipped = 0
    for _, row in df.iterrows():
        code = str(row["student_code"]).strip()
        name_v = str(row["student_name"]).strip()
        course = str(row["course_code"]).strip()
        if not code or not course or code == "nan":
            continue
        student = db.query(models.Student).filter(models.Student.student_code == code).first()
        if not student:
            student = models.Student(student_code=code, name=name_v)
            db.add(student)
            db.flush()
        exists = (
            db.query(models.FxRequest)
            .filter(models.FxRequest.student_id == student.id, models.FxRequest.course_code == course)
            .first()
        )
        if exists:
            skipped += 1
            continue
        db.add(models.FxRequest(student_id=student.id, course_code=course))
        added += 1
    db.commit()
    return {"added": added, "skipped": skipped}


# ===== Schedule generation =====
@router.post("/generate", response_model=schemas.FxGenerateResult)
def run_generate(payload: schemas.FxGenerateRequest, db: Session = Depends(get_db), _user=Depends(require_admin)):
    scheduled, total, unscheduled = generate_schedule(
        db, payload.start_date, payload.end_date, payload.time_slots, payload.default_duration
    )
    msg = f"{scheduled}/{total} пән орналастырылды."
    if unscheduled:
        msg += f" Орналаспаған: {', '.join(unscheduled)}"
    return schemas.FxGenerateResult(
        scheduled_courses=scheduled, total_courses=total, unscheduled=unscheduled, message=msg
    )


@router.get("/schedule", response_model=List[schemas.FxExamOut])
def list_schedule(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    rows = db.query(models.FxExam).order_by(models.FxExam.exam_date, models.FxExam.exam_time).all()
    out = []
    for r in rows:
        out.append(
            schemas.FxExamOut(
                id=r.id,
                course_code=r.course_code,
                duration=r.duration,
                exam_date=r.exam_date,
                exam_time=r.exam_time,
                room_number=r.room.room_number if r.room else None,
                student_count=len(r.student_assignments),
            )
        )
    return out


@router.get("/schedule/student", response_model=Optional[schemas.FxStudentSchedule])
def student_schedule(student_code: str, db: Session = Depends(get_db)):
    """Public endpoint — students look up their schedule by code."""
    student = db.query(models.Student).filter(models.Student.student_code == student_code).first()
    if not student:
        return None
    items = []
    for sa in db.query(models.FxStudentAssignment).filter(models.FxStudentAssignment.student_id == student.id).all():
        ex = sa.fx_exam
        items.append(
            schemas.FxStudentScheduleItem(
                course_code=ex.course_code,
                exam_date=ex.exam_date,
                exam_time=ex.exam_time,
                duration=ex.duration,
                room_number=ex.room.room_number if ex.room else None,
            )
        )
    items.sort(key=lambda x: (x.exam_date, x.exam_time))
    return schemas.FxStudentSchedule(student_code=student.student_code, student_name=student.name, items=items)


@router.post("/requests/import-fx", response_model=schemas.EmployeeImportResult)
async def import_fx_raw(file: UploadFile = File(...), db: Session = Depends(get_db), _user=Depends(require_admin)):
    """Import raw SDU FX registration sheet (columns: COURSE_CODE, INSTRUCTOR, SECTION, STUD_ID, STUD_FULL_NAME, ...)"""
    content = await file.read()
    try:
        added, skipped, errors = import_fx_excel(db, content)
    except Exception as e:
        raise HTTPException(400, f"Файлды оқу қатесі: {e}")
    return schemas.EmployeeImportResult(added=added, skipped=skipped, errors=errors)


@router.get("/schedule/export-bs")
def export_schedule_bs(db: Session = Depends(get_db), _user=Depends(require_admin)):
    """Export 2-sheet BS-style FX schedule (FX кестесі + Өтініш берген білімгерлер тізім)."""
    data = export_fx_excel(db)
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=fx_schedule_bs.xlsx"},
    )


@router.get("/schedule/export")
def export_schedule(db: Session = Depends(get_db), _user=Depends(require_admin)):
    rows = db.query(models.FxExam).order_by(models.FxExam.exam_date, models.FxExam.exam_time).all()
    data = []
    for r in rows:
        for sa in r.student_assignments:
            data.append({
                "Күн": r.exam_date.isoformat(),
                "Уақыт": r.exam_time.strftime("%H:%M"),
                "Пән": r.course_code,
                "Кабинет": r.room.room_number if r.room else "",
                "Студент коды": sa.student.student_code,
                "Студент аты": sa.student.name,
                "Ұзақтығы (мин)": r.duration,
            })
    df = pd.DataFrame(data)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="FX кестесі")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=fx_schedule.xlsx"},
    )
