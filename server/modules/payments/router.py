from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, date
from typing import List

from server.core.database import get_db
from server.core.security import RoleChecker
from server.modules.users.models import User, UserRole
from server.modules.payments.models import TuitionPayment
from server.modules.payments.schemas import (
    TuitionPaymentCreate, TuitionPaymentResponse, 
    ReconciliationRequest, StudentPaymentsStatusResponse
)

router = APIRouter(prefix="/payments", tags=["payments"])

admin_required = RoleChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN])
student_required = RoleChecker([UserRole.STUDENT])

# Helper to dynamically update/calculate payment standing
async def calculate_student_standing(student_id: int, db: AsyncSession):
    # Fetch all payments for student
    stmt = select(TuitionPayment).filter(TuitionPayment.student_id == student_id)
    result = await db.execute(stmt)
    payments = result.scalars().all()
    
    total_balance = 0.0
    has_overdue = False
    today = date.today()
    
    for p in payments:
        # Check if overdue and update db status
        if p.status == "PENDING" and p.due_date < today:
            p.status = "OVERDUE"
            db.add(p)
            has_overdue = True
        elif p.status == "OVERDUE":
            has_overdue = True
            
        if p.status != "PAID":
            total_balance += p.balance_remaining
            
    # Commit any status transitions
    await db.commit()
    
    standing = "RESTRICTED" if has_overdue else "GOOD_STANDING"
    return standing, total_balance, payments


# POST /payments/invoices (Admin only)
@router.post("/invoices", response_model=TuitionPaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    payload: TuitionPaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    # Verify student exists
    student_res = await db.execute(
        select(User).filter(User.id == payload.student_id, User.role == UserRole.STUDENT.value)
    )
    student = student_res.scalars().first()
    if not student:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target user is not a Student")
        
    payment = TuitionPayment(
        student_id=payload.student_id,
        amount=payload.amount,
        balance_remaining=payload.amount,
        due_date=payload.due_date,
        billing_period=payload.billing_period,
        status="OVERDUE" if payload.due_date < date.today() else "PENDING"
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


# GET /payments/student/status (Student only)
@router.get("/student/status", response_model=StudentPaymentsStatusResponse)
async def get_student_payments_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(student_required)
):
    standing, total_balance, payments = await calculate_student_standing(current_user.id, db)
    return StudentPaymentsStatusResponse(
        standing=standing,
        total_balance=total_balance,
        payments=[TuitionPaymentResponse.model_validate(p) for p in payments]
    )


# GET /payments/student/{student_id} (Admin only)
@router.get("/student/{student_id}", response_model=StudentPaymentsStatusResponse)
async def get_student_payments_admin(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    # Verify student exists
    student_res = await db.execute(
        select(User).filter(User.id == student_id, User.role == UserRole.STUDENT.value)
    )
    if not student_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        
    standing, total_balance, payments = await calculate_student_standing(student_id, db)
    return StudentPaymentsStatusResponse(
        standing=standing,
        total_balance=total_balance,
        payments=[TuitionPaymentResponse.model_validate(p) for p in payments]
    )


# POST /payments/reconcile/{payment_id} (Admin only)
@router.post("/reconcile/{payment_id}", response_model=TuitionPaymentResponse)
async def reconcile_payment(
    payment_id: int,
    payload: ReconciliationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    stmt = select(TuitionPayment).filter(TuitionPayment.id == payment_id)
    result = await db.execute(stmt)
    payment = result.scalars().first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found")
        
    payment.status = "PAID"
    payment.balance_remaining = 0.0
    payment.paid_at = datetime.utcnow()
    payment.reconciled_by_id = current_user.id
    payment.notes = payload.notes
    
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment
