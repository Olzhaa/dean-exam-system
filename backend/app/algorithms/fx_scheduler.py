"""FX exam scheduler using constraint-satisfaction backtracking.

A session = (course_code, instructor, section). Each session is one variable.
Domain = cartesian product of (date, time_slot, room) where room can fit all students.
Constraints:
- A student cannot have two sessions in the same (date, time_slot).
- A room is occupied by at most one session in a given (date, time_slot).
"""
from datetime import date, time, timedelta
from typing import List, Tuple, Dict, Set
from sqlalchemy.orm import Session

from .. import models


SlotKey = Tuple[date, time]
SessionKey = Tuple[str, str, str]  # (course_code, instructor, section)
Assignment = Tuple[date, time, int]  # (exam_date, exam_time, room_id)


def _parse_time(s: str) -> time:
    parts = s.split(":")
    return time(int(parts[0]), int(parts[1]) if len(parts) > 1 else 0)


def _date_range(start: date, end: date) -> List[date]:
    days = []
    d = start
    while d <= end:
        days.append(d)
        d += timedelta(days=1)
    return days


def generate_schedule(
    db: Session,
    start_date: date,
    end_date: date,
    time_slot_strs: List[str],
    default_duration: int = 90,
) -> Tuple[int, int, List[str]]:
    # clear previous FX schedule
    db.query(models.FxStudentAssignment).delete()
    db.query(models.FxExam).delete()
    db.commit()

    dates = _date_range(start_date, end_date)
    slots = [_parse_time(s) for s in time_slot_strs]
    rooms: List[models.Room] = db.query(models.Room).order_by(models.Room.capacity.desc()).all()
    if not rooms:
        return 0, 0, ["Кабинеттер жоқ — алдымен кабинеттерді қосыңыз"]
    if not dates or not slots:
        return 0, 0, ["Күн немесе уақыт интервалдары берілмеген"]

    # Group requests by session key
    requests = db.query(models.FxRequest).all()
    session_students: Dict[SessionKey, Set[int]] = {}
    session_meta: Dict[SessionKey, models.FxRequest] = {}
    for req in requests:
        key = (req.course_code, req.instructor or "", req.section or "")
        session_students.setdefault(key, set()).add(req.student_id)
        if key not in session_meta:
            session_meta[key] = req

    total = len(session_students)
    if total == 0:
        return 0, 0, []

    # Order: most-constrained first (largest group)
    session_order = sorted(session_students.keys(), key=lambda k: -len(session_students[k]))

    room_busy: Set[Tuple[date, time, int]] = set()
    student_busy: Dict[int, Set[SlotKey]] = {}
    assignments: Dict[SessionKey, Assignment] = {}

    def try_assign(idx: int) -> bool:
        if idx >= len(session_order):
            return True
        key = session_order[idx]
        students = session_students[key]
        n = len(students)

        for d in dates:
            for s in slots:
                if any((d, s) in student_busy.get(sid, set()) for sid in students):
                    continue
                for room in rooms:
                    if room.capacity < n:
                        continue
                    if (d, s, room.id) in room_busy:
                        continue
                    room_busy.add((d, s, room.id))
                    for sid in students:
                        student_busy.setdefault(sid, set()).add((d, s))
                    assignments[key] = (d, s, room.id)
                    if try_assign(idx + 1):
                        return True
                    room_busy.discard((d, s, room.id))
                    for sid in students:
                        student_busy[sid].discard((d, s))
                    del assignments[key]
        return False

    success = try_assign(0)

    unscheduled: List[str] = []
    if success:
        scheduled = len(assignments)
    else:
        # Greedy fallback
        scheduled = 0
        room_busy.clear()
        student_busy.clear()
        assignments.clear()
        for key in session_order:
            students = session_students[key]
            n = len(students)
            placed = False
            for d in dates:
                for s in slots:
                    if any((d, s) in student_busy.get(sid, set()) for sid in students):
                        continue
                    for room in rooms:
                        if room.capacity < n:
                            continue
                        if (d, s, room.id) in room_busy:
                            continue
                        room_busy.add((d, s, room.id))
                        for sid in students:
                            student_busy.setdefault(sid, set()).add((d, s))
                        assignments[key] = (d, s, room.id)
                        placed = True
                        break
                    if placed:
                        break
                if placed:
                    break
            if placed:
                scheduled += 1
            else:
                course_code, instructor, section = key
                label = f"{course_code}"
                if instructor:
                    label += f" ({instructor})"
                if section:
                    label += f" sec.{section}"
                unscheduled.append(label)

    # Persist
    for key, (d, t, room_id) in assignments.items():
        meta = session_meta[key]
        fx_exam = models.FxExam(
            course_code=key[0],
            course_name=meta.course_title or "",
            instructor=key[1],
            section=key[2],
            program_name=meta.speciality or "",
            course_year=meta.course_year or "",
            ects=meta.ects,
            exam_format="",
            duration=default_duration,
            exam_date=d,
            exam_time=t,
            room_id=room_id,
        )
        db.add(fx_exam)
        db.flush()
        for sid in session_students[key]:
            db.add(models.FxStudentAssignment(fx_exam_id=fx_exam.id, student_id=sid))
    db.commit()

    return scheduled, total, unscheduled
