from datetime import datetime
from sqlalchemy import Integer, ForeignKey, Float, DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from server.core.database import Base
from server.modules.users.models import User

class StaffSalaryConfig(Base):
    __tablename__ = "staff_salary_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                                            nullable=False, unique=True)
    base_salary: Mapped[float] = mapped_column(Float, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow,
                                                    onupdate=datetime.utcnow, nullable=False)
    updated_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"),
                                                    nullable=False)

    staff: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    updated_by: Mapped["User"] = relationship("User", foreign_keys=[updated_by_id])

class SalaryPaymentRecord(Base):
    __tablename__ = "salary_payment_records"
    __table_args__ = (
        UniqueConstraint("staff_id", "payment_month", name="uq_staff_payment_month"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    staff_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                                            nullable=False)
    payment_month: Mapped[str] = mapped_column(String(7), nullable=False)   # "YYYY-MM"
    amount_paid: Mapped[float] = mapped_column(Float, nullable=False)
    paid_on: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    paid_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"),
                                                nullable=False)

    staff: Mapped["User"] = relationship("User", foreign_keys=[staff_id])
    paid_by: Mapped["User"] = relationship("User", foreign_keys=[paid_by_id])
