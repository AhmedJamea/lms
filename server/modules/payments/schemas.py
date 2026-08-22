from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional, List

class TuitionPaymentCreate(BaseModel):
    student_id: int
    amount: float = Field(..., gt=0.0, description="Invoiced tuition amount must be greater than zero")
    due_date: date
    billing_period: str = Field(..., max_length=100)

class TuitionPaymentResponse(BaseModel):
    id: int
    student_id: int
    amount: float
    balance_remaining: float
    due_date: date
    status: str
    paid_at: Optional[datetime] = None
    reconciled_by_id: Optional[int] = None
    billing_period: str
    notes: Optional[str] = None

    model_config = {
        "from_attributes": True
    }

class ReconciliationRequest(BaseModel):
    notes: Optional[str] = Field(None, max_length=255)

class StudentPaymentsStatusResponse(BaseModel):
    standing: str
    total_balance: float
    payments: List[TuitionPaymentResponse]
