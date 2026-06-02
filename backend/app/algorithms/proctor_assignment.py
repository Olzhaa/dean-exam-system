"""Proctor assignment algorithm.

Rules:
- Each exam needs `required_proctors` employees.
- An employee cannot proctor two exams that overlap in time.
- Employees below `min_proctor_count` get priority.
- Employees at `max_proctor_count` are blocked.
"""
from datetime import datetime, timedelta
from typing import List, Tuple, Set, Dict
from sqlalchemy.orm import Session

from .. import models


def _exam_window(exam: models.Exam) -> Tuple[datetime, datetime]:
    start = datetime.combine(exam.exam_date, exam.exam_time)
    end = start + timedelta(minutes=exam.duration)
    return start, end


def _overlaps(a: Tuple[datetime, datetime], b: Tuple[datetime, datetime]) -> bool:
    return a[0] < b[1] and b[0] < a[1]


def auto_assign(db: Session, clear_existing: bool = False) -> Tuple[int, List[int]]:
    if clear_existing:
        db.query(models.ProctorAssignment).delete()
        for e in db.query(models.Employee).all():
            e.current_proctor_count = 0
        db.commit()

    exams: List[models.Exam] = db.query(models.Exam).order_by(models.Exam.exam_date, models.Exam.exam_time).all()
    employees: List[models.Employee] = db.query(models.Employee).filter(models.Employee.is_active == True).all()

    # Pre-compute existing assignments per employee (their busy windows)
    busy: Dict[int, List[Tuple[datetime, datetime]]] = {e.id: [] for e in employees}
    for a in db.query(models.ProctorAssignment).all():
        busy.setdefault(a.employee_id, []).append(_exam_window(a.exam))

    assigned_count = 0
    unassigned_exam_ids: List[int] = []

    for exam in exams:
        existing = len(exam.assignments)
        needed = max(0, exam.required_proctors - existing)
        if needed == 0:
            continue

        already_in_this_exam: Set[int] = {a.employee_id for a in exam.assignments}
        window = _exam_window(exam)

        # Score: lower is better. Prefer those below min, then those with fewer assignments.
        def score(emp: models.Employee) -> Tuple[int, int]:
            below_min = 0 if emp.current_proctor_count >= emp.min_proctor_count else -1
            return (below_min, emp.current_proctor_count)

        candidates = sorted(
            (e for e in employees if e.id not in already_in_this_exam),
            key=score,
        )

        for emp in candidates:
            if needed == 0:
                break
            if emp.current_proctor_count >= emp.max_proctor_count:
                continue
            # time conflict check
            if any(_overlaps(window, w) for w in busy.get(emp.id, [])):
                continue
            assignment = models.ProctorAssignment(exam_id=exam.id, employee_id=emp.id)
            db.add(assignment)
            emp.current_proctor_count += 1
            busy.setdefault(emp.id, []).append(window)
            needed -= 1
            assigned_count += 1

        if needed > 0:
            unassigned_exam_ids.append(exam.id)

    db.commit()
    return assigned_count, unassigned_exam_ids


def can_assign_manually(db: Session, exam_id: int, employee_id: int) -> Tuple[bool, str]:
    exam = db.query(models.Exam).get(exam_id)
    emp = db.query(models.Employee).get(employee_id)
    if not exam or not emp:
        return False, "Емтихан немесе қызметкер табылмады"
    if not emp.is_active:
        return False, "Қызметкер белсенді емес (inactive)"
    if emp.current_proctor_count >= emp.max_proctor_count:
        return False, f"Қызметкер max лимитіне жетті ({emp.max_proctor_count})"
    if any(a.employee_id == employee_id for a in exam.assignments):
        return False, "Қызметкер бұл емтиханға бұрыннан тағайындалған"
    window = _exam_window(exam)
    for a in emp.assignments:
        if a.exam_id == exam_id:
            continue
        if _overlaps(window, _exam_window(a.exam)):
            return False, "Уақыт қиылысы: басқа емтиханға тағайындалған"
    return True, "OK"
