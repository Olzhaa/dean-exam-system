"""FX exam scheduler using constraint-satisfaction backtracking.

Variables: each course that has FX requests.
Domain: cartesian product of (date, time_slot, room) where the room can fit all students.
Constraints:
- A student cannot have two courses in the same (date, time_slot).
- A room is occupied by at most one course in a given (date, time_slot).

Heuristic: most-constrained variable first (course with most students), then smallest domain.
"""
from datetime import date, time, timedelta
from typing import List, Tuple, Dict, Set, Optional
from sqlalchemy.orm import Session

from .. import models


SlotKey = Tuple[date, time]
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

    # Collect courses and students per course
    course_students: Dict[str, Set[int]] = {}
    for req in db.query(models.FxRequest).all():
        course_students.setdefault(req.course_code, set()).add(req.student_id)

    total = len(course_students)
    if total == 0:
        return 0, 0, []

    # Order courses: most students first (most constrained)
    course_order = sorted(course_students.keys(), key=lambda c: -len(course_students[c]))

    # State
    room_busy: Set[Tuple[date, time, int]] = set()
    student_busy: Dict[int, Set[SlotKey]] = {}
    assignments: Dict[str, Assignment] = {}

    def try_assign(idx: int) -> bool:
        if idx >= len(course_order):
            return True
        course = course_order[idx]
        students = course_students[course]
        n = len(students)

        # Iterate candidate (date, slot, room) combos
        for d in dates:
            for s in slots:
                # student conflict?
                if any((d, s) in student_busy.get(sid, set()) for sid in students):
                    continue
                for room in rooms:
                    if room.capacity < n:
                        continue
                    if (d, s, room.id) in room_busy:
                        continue
                    # tentative assign
                    room_busy.add((d, s, room.id))
                    for sid in students:
                        student_busy.setdefault(sid, set()).add((d, s))
                    assignments[course] = (d, s, room.id)
                    if try_assign(idx + 1):
                        return True
                    # backtrack
                    room_busy.discard((d, s, room.id))
                    for sid in students:
                        student_busy[sid].discard((d, s))
                    del assignments[course]
        return False

    success = try_assign(0)

    unscheduled: List[str] = []
    if success:
        scheduled = len(assignments)
    else:
        # Fall back: assign as many as possible greedily
        scheduled = 0
        room_busy.clear()
        student_busy.clear()
        assignments.clear()
        for course in course_order:
            students = course_students[course]
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
                        assignments[course] = (d, s, room.id)
                        placed = True
                        break
                    if placed:
                        break
                if placed:
                    break
            if placed:
                scheduled += 1
            else:
                unscheduled.append(course)

    # Persist
    for course, (d, t, room_id) in assignments.items():
        fx_exam = models.FxExam(
            course_code=course,
            duration=default_duration,
            exam_date=d,
            exam_time=t,
            room_id=room_id,
        )
        db.add(fx_exam)
        db.flush()
        for sid in course_students[course]:
            db.add(models.FxStudentAssignment(fx_exam_id=fx_exam.id, student_id=sid))
    db.commit()

    return scheduled, total, unscheduled
