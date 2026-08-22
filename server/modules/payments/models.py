from datetime import datetime, date
from typing import Optional
from sqlalchemy import Integer, String, Float, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from server.core.database import Base

class TuitionPayment(Base):
    __tablename__ = "tuition_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    balance_remaining: Mapped[float] = mapped_column(Float, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reconciled_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    billing_period: Mapped[str] = mapped_column(String(100), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    student: Mapped["User"] = relationship("User", foreign_keys=[student_id])
    reconciled_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reconciled_by_id])
