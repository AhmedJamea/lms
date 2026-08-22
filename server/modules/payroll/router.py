import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy import select, func, not_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from server.core.database import get_db
from server.core.security import RoleChecker
from server.modules.users.models import User, UserRole
from server.modules.payroll.models import StaffSalaryConfig, SalaryPaymentRecord
from server.modules.payments.models import TuitionPayment
from server.modules.payroll import schemas

router = APIRouter(tags=["Staff Payroll & Finance"])

# Restrict all routes to SUPER_ADMIN role
super_admin_required = RoleChecker([UserRole.SUPER_ADMIN])

def validate_month_format(month: str):
    if not re.match(r"^\d{4}-(0[1-9]|1[0-2])$", month):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid month format. Expected YYYY-MM."
        )

# ─── SALARY CONFIGURATION ──────────────────────────────────────────────────

@router.get(
    "/payroll/staff/salaries",
    response_model=list[schemas.StaffSalaryEntryResponse],
    dependencies=[Depends(super_admin_required)]
)
async def list_staff_salaries(
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(
            User.id.label("user_id"),
            User.name,
            User.role,
            StaffSalaryConfig.base_salary,
            StaffSalaryConfig.updated_at
        )
        .outerjoin(StaffSalaryConfig, StaffSalaryConfig.user_id == User.id)
        .where(
            and_(
                User.is_active == True,
                User.role.in_([UserRole.TEACHER.value, UserRole.ADMIN.value])
            )
        )
        .order_by(User.name)
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    # Map to schema output
    return [
        schemas.StaffSalaryEntryResponse(
            user_id=r.user_id,
            name=r.name,
            role=r.role,
            base_salary=r.base_salary,
            updated_at=r.updated_at
        )
        for r in rows
    ]

@router.put(
    "/payroll/staff/{user_id}/salary",
    response_model=schemas.SetSalaryResponse,
    dependencies=[Depends(super_admin_required)]
)
async def set_staff_salary(
    user_id: int,
    payload: schemas.SetSalaryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    # Verify user exists, active, and is TEACHER or ADMIN
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    if not user.is_active or user.role not in [UserRole.TEACHER.value, UserRole.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not an active staff member eligible for salary"
        )

    # Find or update config
    config_result = await db.execute(select(StaffSalaryConfig).where(StaffSalaryConfig.user_id == user_id))
    config = config_result.scalars().first()

    if config:
        config.base_salary = payload.base_salary
        config.updated_at = datetime.utcnow()
        config.updated_by_id = current_user.id
    else:
        config = StaffSalaryConfig(
            user_id=user_id,
            base_salary=payload.base_salary,
            updated_at=datetime.utcnow(),
            updated_by_id=current_user.id
        )
        db.add(config)

    await db.commit()
    return schemas.SetSalaryResponse(
        user_id=user_id,
        name=user.name,
        base_salary=config.base_salary,
        updated_at=config.updated_at
    )

# ─── PAYROLL EXECUTION ─────────────────────────────────────────────────────

@router.get(
    "/payroll/list/{month}",
    response_model=list[schemas.StaffPayrollEntryResponse],
    dependencies=[Depends(super_admin_required)]
)
async def get_payroll_list(
    month: str,
    db: AsyncSession = Depends(get_db)
):
    validate_month_format(month)
    
    stmt = (
        select(
            User.id.label("user_id"),
            User.name,
            User.role,
            StaffSalaryConfig.base_salary,
            SalaryPaymentRecord.id.label("payment_id"),
            SalaryPaymentRecord.amount_paid,
            SalaryPaymentRecord.paid_on
        )
        .outerjoin(StaffSalaryConfig, StaffSalaryConfig.user_id == User.id)
        .outerjoin(
            SalaryPaymentRecord,
            and_(
                SalaryPaymentRecord.staff_id == User.id,
                SalaryPaymentRecord.payment_month == month
            )
        )
        .where(
            and_(
                User.is_active == True,
                User.role.in_([UserRole.TEACHER.value, UserRole.ADMIN.value])
            )
        )
        .order_by(User.name)
    )

    result = await db.execute(stmt)
    rows = result.all()

    entries = []
    for r in rows:
        if r.payment_id is not None:
            payroll_status = "PAID"
        elif r.base_salary is None:
            payroll_status = "NOT_CONFIGURED"
        else:
            payroll_status = "PENDING"

        entries.append(
            schemas.StaffPayrollEntryResponse(
                user_id=r.user_id,
                name=r.name,
                role=r.role,
                base_salary=r.base_salary,
                status=payroll_status,
                payment_id=r.payment_id,
                amount_paid=r.amount_paid,
                paid_on=r.paid_on
            )
        )
    return entries

@router.post(
    "/payroll/staff/{user_id}/pay",
    response_model=schemas.SalaryPaymentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(super_admin_required)]
)
async def mark_salary_paid(
    user_id: int,
    payload: schemas.MarkPaidRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(super_admin_required)
):
    validate_month_format(payload.payment_month)

    # 1. Verify user exists, active, and is staff
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    if not user.is_active or user.role not in [UserRole.TEACHER.value, UserRole.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not an active staff member eligible for payroll"
        )

    # 2. Check salary config exists
    config_result = await db.execute(select(StaffSalaryConfig).where(StaffSalaryConfig.user_id == user_id))
    config = config_result.scalars().first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Salary config not set for this staff member"
        )

    # 3. Create payment record
    payment = SalaryPaymentRecord(
        staff_id=user_id,
        payment_month=payload.payment_month,
        amount_paid=config.base_salary,
        paid_on=datetime.utcnow(),
        paid_by_id=current_user.id
    )
    
    db.add(payment)
    try:
        await db.commit()
        await db.refresh(payment)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Salary already paid for this month"
        )

    return schemas.SalaryPaymentResponse(
        id=payment.id,
        staff_id=payment.staff_id,
        payment_month=payment.payment_month,
        amount_paid=payment.amount_paid,
        paid_on=payment.paid_on
    )

# ─── FINANCIAL DASHBOARD ───────────────────────────────────────────────────

@router.get(
    "/payroll/dashboard/{month}",
    response_model=schemas.FinancialSummaryResponse,
    dependencies=[Depends(super_admin_required)]
)
async def get_financial_summary(
    month: str,
    db: AsyncSession = Depends(get_db)
):
    validate_month_format(month)

    # Q1: Fees Collected
    q1 = select(func.coalesce(func.sum(TuitionPayment.amount), 0.0)).where(
        and_(
            TuitionPayment.status == "PAID",
            TuitionPayment.billing_period == month
        )
    )
    res1 = await db.execute(q1)
    fees_collected = res1.scalar_one()

    # Q2: Fees Pending
    q2 = select(func.coalesce(func.sum(TuitionPayment.balance_remaining), 0.0)).where(
        and_(
            TuitionPayment.status.in_(["PENDING", "OVERDUE"]),
            TuitionPayment.billing_period == month
        )
    )
    res2 = await db.execute(q2)
    fees_pending = res2.scalar_one()

    # Q3: Salaries Paid
    q3 = select(func.coalesce(func.sum(SalaryPaymentRecord.amount_paid), 0.0)).where(
        SalaryPaymentRecord.payment_month == month
    )
    res3 = await db.execute(q3)
    salaries_paid = res3.scalar_one()

    # Q4: Salaries Pending
    paid_subquery = (
        select(SalaryPaymentRecord.staff_id)
        .where(SalaryPaymentRecord.payment_month == month)
        .scalar_subquery()
    )

    q4 = (
        select(func.coalesce(func.sum(StaffSalaryConfig.base_salary), 0.0))
        .join(User, StaffSalaryConfig.user_id == User.id)
        .where(
            and_(
                User.is_active == True,
                User.role.in_([UserRole.TEACHER.value, UserRole.ADMIN.value]),
                StaffSalaryConfig.user_id.not_in(paid_subquery)
            )
        )
    )
    res4 = await db.execute(q4)
    salaries_pending = res4.scalar_one()

    # Q5: Net Balance (computed in Python)
    net_balance = fees_collected - salaries_paid

    return schemas.FinancialSummaryResponse(
        month=month,
        fees_collected=fees_collected,
        fees_pending=fees_pending,
        salaries_paid=salaries_paid,
        salaries_pending=salaries_pending,
        net_balance=net_balance
    )
