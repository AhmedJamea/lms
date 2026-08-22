from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import date
from typing import Optional, List

from server.core.database import get_db
from server.core.security import RoleChecker, check_payment_standing
from server.modules.users.models import User, UserRole
from server.modules.academic.models import Course
from server.modules.attendance.models import StaffAbsence
from server.modules.attendance import service
from server.modules.attendance.schemas import (
    CourseRosterResponse,
    AttendanceLogRequest,
    AttendanceLogResponse,
    StudentAttendanceSummaryResponse,
    StaffAbsenceCreate,
    StaffAbsenceResponse,
    StaffAbsenceLogResponse
)

router = APIRouter(prefix="/attendance", tags=["Attendance & Absence Tracking"])

# Role guards
admin_required = RoleChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN])
admin_or_teacher_required = RoleChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER])
student_required = RoleChecker([UserRole.STUDENT])


@router.get("/courses/{course_id}/roster", response_model=CourseRosterResponse)
async def get_course_roster_endpoint(
    course_id: int,
    date_val: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_or_teacher_required)
):
    selected_date = date_val or date.today()
    
    # Restrict to past or current dates
    if selected_date > date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student attendance cannot be logged for future dates"
        )

    # Fetch course
    course = await db.scalar(select(Course).filter(Course.id == course_id))
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Teacher assignment checks
    if current_user.role == UserRole.TEACHER.value and course.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access rosters for courses you do not teach"
        )

    roster_data = await service.get_course_roster(db, course_id, selected_date)
    return roster_data


@router.post("/courses/{course_id}", response_model=AttendanceLogResponse)
async def save_student_attendance_endpoint(
    course_id: int,
    payload: AttendanceLogRequest,
    date_val: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_or_teacher_required)
):
    selected_date = date_val or date.today()

    if selected_date > date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student attendance cannot be logged for future dates"
        )

    # Fetch course
    course = await db.scalar(select(Course).filter(Course.id == course_id))
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Teacher assignment checks
    if current_user.role == UserRole.TEACHER.value and course.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to log attendance for courses you do not teach"
        )

    count = await service.save_student_attendance(
        db=db,
        course_id=course_id,
        selected_date=selected_date,
        records=payload.records,
        recorded_by_id=current_user.id
    )

    return AttendanceLogResponse(
        status="success",
        message="Attendance records saved successfully",
        count=count
    )


@router.get("/student/my-summary", response_model=StudentAttendanceSummaryResponse)
async def get_student_summary_self(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(student_required),
    _ = Depends(check_payment_standing)
):
    summary = await service.get_student_attendance_summary(db, current_user.id)
    return summary


@router.get("/student/{student_id}/summary", response_model=StudentAttendanceSummaryResponse)
async def get_student_summary_other(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_or_teacher_required)
):
    # Verify student exists
    student = await db.scalar(
        select(User).filter(User.id == student_id, User.role == UserRole.STUDENT.value)
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    summary = await service.get_student_attendance_summary(db, student_id)
    return summary


@router.get("/staff/absences", response_model=List[StaffAbsenceResponse])
async def list_staff_absences(
    date_val: Optional[date] = None,
    user_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    absences = await service.get_staff_absences(db, date_val, user_id)
    return absences


@router.post("/staff/absences", response_model=StaffAbsenceLogResponse, status_code=status.HTTP_201_CREATED)
async def create_staff_absence_endpoint(
    payload: StaffAbsenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    # Check self-logging
    if payload.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot log their own absences"
        )

    # Fetch target user
    target_user = await db.scalar(select(User).filter(User.id == payload.user_id))
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )

    if target_user.role == UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Staff absences can only be logged for teachers or admins"
        )

    # Verify admin credentials bounds
    is_target_admin = target_user.role in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]
    if is_target_admin and current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super-Admins can log standard Admin absences"
        )

    absence = await service.create_staff_absence(db, current_user.id, payload)
    return StaffAbsenceLogResponse(
        absence_id=absence.id,
        status="success",
        message="Staff absence recorded successfully"
    )


@router.delete("/staff/absences/{absence_id}", response_model=dict)
async def delete_staff_absence_endpoint(
    absence_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    # Fetch absence record
    absence = await db.scalar(select(StaffAbsence).filter(StaffAbsence.id == absence_id))
    if not absence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff absence record not found"
        )

    # Check self-deletion
    if absence.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot delete their own absence records"
        )

    # Fetch absent user details
    target_user = await db.scalar(select(User).filter(User.id == absence.user_id))
    if target_user:
        is_target_admin = target_user.role in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]
        if is_target_admin and current_user.role != UserRole.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super-Admins can manage standard Admin absences"
            )

    await service.delete_staff_absence(db, absence_id)
    return {"status": "success", "message": "Staff absence record deleted successfully"}
