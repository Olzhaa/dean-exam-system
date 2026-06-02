from sqlalchemy import Column, Integer, String, ForeignKey, Date, Time, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")  # admin | user


class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    min_proctor_count = Column(Integer, nullable=False, default=0)
    max_proctor_count = Column(Integer, nullable=False, default=10)
    current_proctor_count = Column(Integer, nullable=False, default=0)

    assignments = relationship("ProctorAssignment", back_populates="employee", cascade="all, delete-orphan")


class Exam(Base):
    __tablename__ = "exams"
    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)  # minutes
    room_number = Column(String, nullable=False)
    required_proctors = Column(Integer, nullable=False, default=1)
    exam_date = Column(Date, nullable=False)
    exam_time = Column(Time, nullable=False)

    assignments = relationship("ProctorAssignment", back_populates="exam", cascade="all, delete-orphan")


class ProctorAssignment(Base):
    __tablename__ = "proctor_assignments"
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)

    exam = relationship("Exam", back_populates="assignments")
    employee = relationship("Employee", back_populates="assignments")

    __table_args__ = (UniqueConstraint("exam_id", "employee_id", name="uq_exam_employee"),)


class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String, unique=True, nullable=False)
    capacity = Column(Integer, nullable=False)


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    student_code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)

    fx_requests = relationship("FxRequest", back_populates="student", cascade="all, delete-orphan")


class FxRequest(Base):
    __tablename__ = "fx_requests"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    course_code = Column(String, nullable=False)

    student = relationship("Student", back_populates="fx_requests")

    __table_args__ = (UniqueConstraint("student_id", "course_code", name="uq_student_course"),)


class FxExam(Base):
    """A scheduled FX exam slot for a single course."""
    __tablename__ = "fx_exams"
    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String, nullable=False)
    duration = Column(Integer, nullable=False, default=90)  # minutes
    exam_date = Column(Date, nullable=False)
    exam_time = Column(Time, nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)

    room = relationship("Room")
    student_assignments = relationship("FxStudentAssignment", back_populates="fx_exam", cascade="all, delete-orphan")


class FxStudentAssignment(Base):
    __tablename__ = "fx_student_assignments"
    id = Column(Integer, primary_key=True, index=True)
    fx_exam_id = Column(Integer, ForeignKey("fx_exams.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)

    fx_exam = relationship("FxExam", back_populates="student_assignments")
    student = relationship("Student")

    __table_args__ = (UniqueConstraint("fx_exam_id", "student_id", name="uq_fxexam_student"),)
