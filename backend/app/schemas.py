from pydantic import BaseModel, ConfigDict
from datetime import date, time
from typing import Optional, List


# ===== Auth =====
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


# ===== Employees =====
class EmployeeBase(BaseModel):
    name: str
    department: Optional[str] = ""
    is_active: bool = True
    min_proctor_count: int = 0
    max_proctor_count: int = 10


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    min_proctor_count: Optional[int] = None
    max_proctor_count: Optional[int] = None


class EmployeeOut(EmployeeBase):
    id: int
    current_proctor_count: int
    model_config = ConfigDict(from_attributes=True)


class EmployeeImportResult(BaseModel):
    added: int
    skipped: int
    errors: List[str] = []


# ===== Exams =====
class ExamBase(BaseModel):
    course_code: str
    course_name: Optional[str] = ""
    program_name: Optional[str] = ""
    lecturer: Optional[str] = ""
    course_year: Optional[str] = ""
    ects: Optional[int] = None
    student_count: Optional[int] = 0
    exam_format: Optional[str] = ""
    duration: int
    room_number: str
    required_proctors: int = 1
    exam_date: date
    exam_time: time


class ExamCreate(ExamBase):
    pass


class ExamOut(ExamBase):
    id: int
    rooms_list: List[str] = []
    model_config = ConfigDict(from_attributes=True)


class ExamImportResult(BaseModel):
    added: int
    skipped: int
    errors: List[str] = []


# ===== Proctor Assignment =====
class ProctorAssignmentOut(BaseModel):
    id: int
    exam_id: int
    employee_id: int
    employee_name: Optional[str] = None
    room: Optional[str] = ""
    model_config = ConfigDict(from_attributes=True)


class ManualAssignRequest(BaseModel):
    exam_id: int
    employee_id: int


class AutoAssignResult(BaseModel):
    assigned: int
    unassigned_exams: List[int]
    message: str


# ===== Rooms =====
class RoomBase(BaseModel):
    room_number: str
    capacity: int


class RoomCreate(RoomBase):
    pass


class RoomOut(RoomBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ===== Students =====
class StudentBase(BaseModel):
    student_code: str
    name: str


class StudentCreate(StudentBase):
    pass


class StudentOut(StudentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ===== FX Requests =====
class FxRequestCreate(BaseModel):
    student_code: str
    student_name: str
    course_code: str


class FxRequestOut(BaseModel):
    id: int
    student_id: int
    student_code: str
    student_name: str
    course_code: str


# ===== FX Schedule =====
class FxGenerateRequest(BaseModel):
    start_date: date
    end_date: date
    time_slots: List[str]  # e.g. ["09:00", "11:30", "14:30"]
    default_duration: int = 90


class FxExamOut(BaseModel):
    id: int
    course_code: str
    duration: int
    exam_date: date
    exam_time: time
    room_number: Optional[str] = None
    student_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class FxStudentScheduleItem(BaseModel):
    course_code: str
    exam_date: date
    exam_time: time
    duration: int
    room_number: Optional[str] = None


class FxStudentSchedule(BaseModel):
    student_code: str
    student_name: str
    items: List[FxStudentScheduleItem]


class FxGenerateResult(BaseModel):
    scheduled_courses: int
    total_courses: int
    unscheduled: List[str]
    message: str
