from datetime import datetime, date
from typing import Optional
from sqlalchemy import Integer, String, DateTime, Date, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from server.core.database import Base

class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    academic_year: Mapped[str] = mapped_column(String(50), nullable=False)

    # Relationships
    enrolments: Mapped[list["StudentEnrolment"]] = relationship(
        "StudentEnrolment", back_populates="grade", cascade="all, delete-orphan"
    )
    courses: Mapped[list["Course"]] = relationship(
        "Course", back_populates="grade", cascade="all, delete-orphan"
    )


class StudentEnrolment(Base):
    __tablename__ = "student_enrolments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    grade_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("grades.id", ondelete="CASCADE"), nullable=False
    )
    enrolled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    grade: Mapped["Grade"] = relationship("Grade", back_populates="enrolments")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    grade_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("grades.id", ondelete="CASCADE"), nullable=False
    )
    teacher_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    credits: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    # Relationships
    grade: Mapped["Grade"] = relationship("Grade", back_populates="courses")
    teacher: Mapped[Optional["User"]] = relationship("User")
    timetable_slots: Mapped[list["TimetableSlot"]] = relationship(
        "TimetableSlot", back_populates="course", cascade="all, delete-orphan"
    )
    exam_schedules: Mapped[list["ExamSchedule"]] = relationship(
        "ExamSchedule", back_populates="course", cascade="all, delete-orphan"
    )


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    day_of_week: Mapped[str] = mapped_column(String(50), nullable=False)
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)
    room: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    course: Mapped["Course"] = relationship("Course", back_populates="timetable_slots")


class ExamSchedule(Base):
    __tablename__ = "exam_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    exam_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)
    room: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    course: Mapped["Course"] = relationship("Course", back_populates="exam_schedules")


class CourseGrade(Base):
    __tablename__ = "course_grades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    grade_value: Mapped[str] = mapped_column(String(10), nullable=False)
    gpa_points: Mapped[float] = mapped_column(Float, nullable=False)
    graded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    student: Mapped["User"] = relationship("User")
    course: Mapped["Course"] = relationship("Course")

    __table_args__ = (
        UniqueConstraint("student_id", "course_id", name="uq_student_course_grade"),
    )

