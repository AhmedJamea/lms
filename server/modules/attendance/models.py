from datetime import date
from typing import Optional
from sqlalchemy import Integer, String, Boolean, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from server.core.database import Base

class StudentAttendance(Base):
    __tablename__ = "student_attendance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # PRESENT, ABSENT, LATE, EXCUSED
    remarks: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recorded_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("student_id", "course_id", "date", name="uq_student_course_date"),
    )

    # Relationships
    student: Mapped["User"] = relationship("User", foreign_keys=[student_id])
    course: Mapped["Course"] = relationship("Course")
    recorded_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[recorded_by_id])


class StaffAbsence(Base):
    __tablename__ = "staff_absences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_excused: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recorded_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_user_date_absence"),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    recorded_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[recorded_by_id])
