from datetime import datetime
from pydantic import BaseModel, Field

class SetSalaryRequest(BaseModel):
    base_salary: float = Field(..., gt=0, description="Monthly base salary, must be > 0")

class SetSalaryResponse(BaseModel):
    user_id: int
    name: str
    base_salary: float
    updated_at: datetime

    class Config:
        from_attributes = True

class StaffSalaryEntryResponse(BaseModel):
    user_id: int
    name: str
    role: str
    base_salary: float | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

class MarkPaidRequest(BaseModel):
    payment_month: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$")

class SalaryPaymentResponse(BaseModel):
    id: int
    staff_id: int
    payment_month: str
    amount_paid: float
    paid_on: datetime

    class Config:
        from_attributes = True

class StaffPayrollEntryResponse(BaseModel):
    user_id: int
    name: str
    role: str
    base_salary: float | None = None
    status: str            # "PAID" | "PENDING" | "NOT_CONFIGURED"
    payment_id: int | None = None
    amount_paid: float | None = None
    paid_on: datetime | None = None

    class Config:
        from_attributes = True

class FinancialSummaryResponse(BaseModel):
    month: str
    fees_collected: float
    fees_pending: float
    salaries_paid: float
    salaries_pending: float
    net_balance: float     # computed: fees_collected - salaries_paid

    class Config:
        from_attributes = True
