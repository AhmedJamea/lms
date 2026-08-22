from datetime import date
from typing import Optional, List, Dict, Any
from sqlalchemy import select, delete, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.sqlite import insert

from server.modules.users.models import User
from server.modules.academic.models import Course, StudentEnrolment
from server.modules.attendance.models import StudentAttendance, StaffAbsence
from server.modules.attendance.schemas import StudentAttendanceRecordInput, StaffAbsenceCreate


async def get_course_roster(db: AsyncSession, course_id: int, selected_date: date) -> Dict[str, Any]:
    # Fetch Course to get grade_id
    course = await db.scalar(select(Course).filter(Course.id == course_id))
    if not course:
        return {"course_id": course_id, "date": selected_date, "roster": []}

    # Fetch students enrolled in this Grade
    student_enrolments = (await db.scalars(
        select(StudentEnrolment).filter(StudentEnrolment.grade_id == course.grade_id)
    )).all()
    student_ids = [se.student_id for se in student_enrolments]

    if not student_ids:
        return {"course_id": course_id, "date": selected_date, "roster": []}

    # Fetch User details for these students
    students = (await db.scalars(
        select(User).filter(and_(User.id.in_(student_ids), User.role == "student"))
    )).all()

    # Fetch existing attendance logs for this course on this date
    attendance_records = (await db.scalars(
        select(StudentAttendance).filter(
            and_(
                StudentAttendance.course_id == course_id,
                StudentAttendance.date == selected_date
            )
        )
    )).all()

    # Map existing status
    attendance_map = {rec.student_id: rec for rec in attendance_records}

    roster_list = []
    for s in students:
        rec = attendance_map.get(s.id)
        roster_list.append({
            "student_id": s.id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "status": rec.status if rec else None,
            "remarks": rec.remarks if rec else None
        })

    return {
        "course_id": course_id,
        "date": selected_date,
        "roster": roster_list
    }


async def save_student_attendance(
    db: AsyncSession,
    course_id: int,
    selected_date: date,
    records: List[StudentAttendanceRecordInput],
    recorded_by_id: int
) -> int:
    count = 0
    for record in records:
        stmt = insert(StudentAttendance).values(
            student_id=record.student_id,
            course_id=course_id,
            date=selected_date,
            status=record.status,
            remarks=record.remarks,
            recorded_by_id=recorded_by_id
        )
        upsert_stmt = stmt.on_conflict_do_update(
            index_elements=["student_id", "course_id", "date"],
            set_={
                "status": stmt.excluded.status,
                "remarks": stmt.excluded.remarks,
                "recorded_by_id": stmt.excluded.recorded_by_id
            }
        )
        await db.execute(upsert_stmt)
        count += 1
    await db.commit()
    return count


async def get_student_attendance_summary(db: AsyncSession, student_id: int) -> Dict[str, Any]:
    # Fetch all student attendance logs
    records = (await db.scalars(
        select(StudentAttendance)
        .options(selectinload(StudentAttendance.course))
        .filter(StudentAttendance.student_id == student_id)
        .order_by(StudentAttendance.date.desc())
    )).all()

    # Absences counts
    total_absences = 0
    total_late = 0
    total_excused = 0

    course_stats: Dict[int, Dict[str, Any]] = {}
    history = []

    for r in records:
        status_upper = r.status.upper()
        
        # Log unexcused absences towards the total count
        if status_upper == "ABSENT":
            total_absences += 1
        elif status_upper == "LATE":
            total_late += 1
        elif status_upper == "EXCUSED":
            total_excused += 1

        # Track history details for non-present events
        history.append({
            "course_name": r.course.name if r.course else "Unknown Course",
            "date": r.date,
            "status": r.status,
            "remarks": r.remarks
        })

        if r.course_id not in course_stats:
            course_stats[r.course_id] = {
                "course_id": r.course_id,
                "course_name": r.course.name if r.course else "Unknown Course",
                "absences": 0,
                "late": 0,
                "excused": 0
            }
        
        if status_upper == "ABSENT":
            course_stats[r.course_id]["absences"] += 1
        elif status_upper == "LATE":
            course_stats[r.course_id]["late"] += 1
        elif status_upper == "EXCUSED":
            course_stats[r.course_id]["excused"] += 1

    return {
        "student_id": student_id,
        "total_absences": total_absences,
        "total_late": total_late,
        "total_excused": total_excused,
        "course_summaries": list(course_stats.values()),
        "history": history
    }


async def get_staff_absences(
    db: AsyncSession,
    selected_date: Optional[date] = None,
    user_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    query = select(StaffAbsence).options(
        selectinload(StaffAbsence.user),
        selectinload(StaffAbsence.recorded_by)
    )

    if selected_date:
        query = query.filter(StaffAbsence.date == selected_date)
    if user_id:
        query = query.filter(StaffAbsence.user_id == user_id)

    query = query.order_by(StaffAbsence.date.desc())
    records = (await db.scalars(query)).all()

    response = []
    for r in records:
        response.append({
            "absence_id": r.id,
            "user_id": r.user_id,
            "name": r.user.name if r.user else "Unknown Staff",
            "role": r.user.role if r.user else "staff",
            "date": r.date,
            "reason": r.reason,
            "is_excused": r.is_excused,
            "recorded_by_name": r.recorded_by.name if r.recorded_by else "System"
        })
    return response


async def create_staff_absence(
    db: AsyncSession,
    creator_id: int,
    payload: StaffAbsenceCreate
) -> StaffAbsence:
    absence = StaffAbsence(
        user_id=payload.user_id,
        date=payload.date,
        reason=payload.reason,
        is_excused=payload.is_excused,
        recorded_by_id=creator_id
    )
    db.add(absence)
    await db.commit()
    await db.refresh(absence)
    return absence


async def delete_staff_absence(db: AsyncSession, absence_id: int) -> bool:
    absence = await db.scalar(select(StaffAbsence).filter(StaffAbsence.id == absence_id))
    if not absence:
        return False
    await db.delete(absence)
    await db.commit()
    return True
