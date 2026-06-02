from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db
from ..auth import require_admin
from ..algorithms.proctor_assignment import auto_assign, can_assign_manually

router = APIRouter(prefix="/proctors", tags=["proctors"])


@router.get("/assignments/{exam_id}", response_model=List[schemas.ProctorAssignmentOut])
def list_assignments(exam_id: int, db: Session = Depends(get_db), _user=Depends(require_admin)):
    rows = db.query(models.ProctorAssignment).filter(models.ProctorAssignment.exam_id == exam_id).all()
    return [
        schemas.ProctorAssignmentOut(
            id=r.id, exam_id=r.exam_id, employee_id=r.employee_id, employee_name=r.employee.name
        )
        for r in rows
    ]


@router.post("/auto-assign", response_model=schemas.AutoAssignResult)
def run_auto_assign(clear: bool = False, db: Session = Depends(get_db), _user=Depends(require_admin)):
    assigned, unassigned = auto_assign(db, clear_existing=clear)
    msg = f"{assigned} тағайындау жасалды."
    if unassigned:
        msg += f" {len(unassigned)} емтиханға толық проктор табылмады."
    return schemas.AutoAssignResult(assigned=assigned, unassigned_exams=unassigned, message=msg)


@router.post("/manual", response_model=schemas.ProctorAssignmentOut)
def manual_assign(payload: schemas.ManualAssignRequest, db: Session = Depends(get_db), _user=Depends(require_admin)):
    ok, msg = can_assign_manually(db, payload.exam_id, payload.employee_id)
    if not ok:
        raise HTTPException(400, msg)
    emp = db.query(models.Employee).get(payload.employee_id)
    a = models.ProctorAssignment(exam_id=payload.exam_id, employee_id=payload.employee_id)
    db.add(a)
    emp.current_proctor_count += 1
    db.commit()
    db.refresh(a)
    return schemas.ProctorAssignmentOut(
        id=a.id, exam_id=a.exam_id, employee_id=a.employee_id, employee_name=emp.name
    )


@router.delete("/assignment/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db), _user=Depends(require_admin)):
    a = db.query(models.ProctorAssignment).get(assignment_id)
    if not a:
        raise HTTPException(404, "Тағайындау табылмады")
    emp = a.employee
    if emp.current_proctor_count > 0:
        emp.current_proctor_count -= 1
    db.delete(a)
    db.commit()
    return {"ok": True}
