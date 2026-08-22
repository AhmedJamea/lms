from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from datetime import datetime, date

from server.core.database import get_db
from server.core.security import RoleChecker, check_payment_standing
from server.modules.users.models import User, UserRole
from server.modules.academic.models import Grade, Course, StudentEnrolment, TimetableSlot, ExamSchedule, CourseGrade
from server.modules.academic.schemas import (
    GradeCreate, GradeResponse,
    EnrolmentCreate, EnrolmentResponse,
    CourseCreate, CourseUpdate, CourseResponse,
    TimetableSlotCreate, TimetableSlotResponse,
    ExamScheduleCreate, ExamScheduleResponse,
    StudentTimetableData,
    CourseGradeCreate, CourseGradeResponse, StudentTranscriptResponse, TranscriptGradeItem
)

router = APIRouter(prefix="/academic", tags=["Academic Content Management"])

# Role guards
admin_required = RoleChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN])
admin_or_teacher_required = RoleChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER])
student_required = RoleChecker([UserRole.STUDENT])

# --- GRADES CRUD (ADMIN ONLY) ---

@router.get("/grades", response_model=list[GradeResponse])
async def list_grades(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(select(Grade))
    return result.scalars().all()


@router.post("/grades", response_model=GradeResponse, status_code=status.HTTP_201_CREATED)
async def create_grade(
    payload: GradeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    grade = Grade(
        name=payload.name,
        level=payload.level,
        academic_year=payload.academic_year
    )
    db.add(grade)
    await db.commit()
    await db.refresh(grade)
    return grade


@router.get("/grades/{id}", response_model=GradeResponse)
async def get_grade(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(select(Grade).filter(Grade.id == id))
    grade = result.scalars().first()
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    return grade


@router.put("/grades/{id}", response_model=GradeResponse)
async def update_grade(
    id: int,
    payload: GradeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(select(Grade).filter(Grade.id == id))
    grade = result.scalars().first()
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    
    grade.name = payload.name
    grade.level = payload.level
    grade.academic_year = payload.academic_year
    db.add(grade)
    await db.commit()
    await db.refresh(grade)
    return grade


@router.delete("/grades/{id}")
async def delete_grade(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(select(Grade).filter(Grade.id == id))
    grade = result.scalars().first()
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    
    await db.delete(grade)
    await db.commit()
    return {"status": "success", "message": "Grade deleted successfully"}


# --- COURSES CRUD (ADMIN/TEACHER/STUDENT BOUNDS) ---

@router.get("/courses", response_model=list[CourseResponse])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_or_teacher_required)
):
    result = await db.execute(
        select(Course)
        .options(joinedload(Course.grade), joinedload(Course.teacher))
    )
    courses = result.scalars().all()
    
    response = []
    for c in courses:
        response.append(
            CourseResponse(
                id=c.id,
                name=c.name,
                code=c.code,
                grade_id=c.grade_id,
                grade_name=c.grade.name,
                teacher_id=c.teacher_id,
                teacher_name=c.teacher.name if c.teacher else None
            )
        )
    return response


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    # Verify Grade exists
    grade_res = await db.execute(select(Grade).filter(Grade.id == payload.grade_id))
    grade = grade_res.scalars().first()
    if not grade:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Grade not found")
    
    # Verify Teacher has TEACHER role
    teacher_name = None
    if payload.teacher_id is not None:
        teacher_res = await db.execute(
            select(User).filter(User.id == payload.teacher_id, User.role == UserRole.TEACHER.value)
        )
        teacher = teacher_res.scalars().first()
        if not teacher:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user is not a Teacher")
        teacher_name = teacher.name

    course = Course(
        name=payload.name,
        code=payload.code,
        grade_id=payload.grade_id,
        teacher_id=payload.teacher_id
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    
    return CourseResponse(
        id=course.id,
        name=course.name,
        code=course.code,
        grade_id=course.grade_id,
        grade_name=grade.name,
        teacher_id=course.teacher_id,
        teacher_name=teacher_name
    )


@router.get("/courses/{id}", response_model=CourseResponse)
async def get_course(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_or_teacher_required)
):
    result = await db.execute(
        select(Course)
        .options(joinedload(Course.grade), joinedload(Course.teacher))
        .filter(Course.id == id)
    )
    c = result.scalars().first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    
    return CourseResponse(
        id=c.id,
        name=c.name,
        code=c.code,
        grade_id=c.grade_id,
        grade_name=c.grade.name,
        teacher_id=c.teacher_id,
        teacher_name=c.teacher.name if c.teacher else None
    )


@router.put("/courses/{id}", response_model=CourseResponse)
async def update_course(
    id: int,
    payload: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    # Fetch course
    result = await db.execute(
        select(Course)
        .options(joinedload(Course.grade), joinedload(Course.teacher))
        .filter(Course.id == id)
    )
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    
    if payload.grade_id is not None:
        grade_res = await db.execute(select(Grade).filter(Grade.id == payload.grade_id))
        grade = grade_res.scalars().first()
        if not grade:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Grade not found")
        course.grade_id = payload.grade_id
        
    if payload.teacher_id is not None:
        teacher_res = await db.execute(
            select(User).filter(User.id == payload.teacher_id, User.role == UserRole.TEACHER.value)
        )
        teacher = teacher_res.scalars().first()
        if not teacher:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user is not a Teacher")
        course.teacher_id = payload.teacher_id
    elif payload.teacher_id == 0:  # Allow unassigning
        course.teacher_id = None
        
    if payload.name is not None:
        course.name = payload.name
    if payload.code is not None:
        course.code = payload.code
        
    db.add(course)
    await db.commit()
    
    # Reload course with relations
    result = await db.execute(
        select(Course)
        .options(joinedload(Course.grade), joinedload(Course.teacher))
        .filter(Course.id == id)
    )
    c = result.scalars().first()
    
    return CourseResponse(
        id=c.id,
        name=c.name,
        code=c.code,
        grade_id=c.grade_id,
        grade_name=c.grade.name,
        teacher_id=c.teacher_id,
        teacher_name=c.teacher.name if c.teacher else None
    )


@router.delete("/courses/{id}")
async def delete_course(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(select(Course).filter(Course.id == id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    
    await db.delete(course)
    await db.commit()
    return {"status": "success", "message": "Course deleted successfully"}


# --- STUDENT ENROLMENTS (ADMIN ONLY) ---

@router.get("/enrolments", response_model=list[EnrolmentResponse])
async def list_enrolments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(
        select(StudentEnrolment)
        .options(joinedload(StudentEnrolment.grade))
    )
    enrolments = result.scalars().all()
    
    response = []
    for e in enrolments:
        # Fetch student details
        student_res = await db.execute(select(User).filter(User.id == e.student_id))
        student = student_res.scalars().first()
        student_name = student.name if student else "Unknown Student"
        
        response.append(
            EnrolmentResponse(
                id=e.id,
                student_id=e.student_id,
                grade_id=e.grade_id,
                enrolled_at=e.enrolled_at,
                student_name=student_name,
                grade_name=e.grade.name
            )
        )
    return response


@router.post("/enrolments", response_model=EnrolmentResponse, status_code=status.HTTP_201_CREATED)
async def create_enrolment(
    payload: EnrolmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    # Verify student exists and has STUDENT role
    student_res = await db.execute(
        select(User).filter(User.id == payload.student_id, User.role == UserRole.STUDENT.value)
    )
    student = student_res.scalars().first()
    if not student:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target user is not a Student")
        
    # Verify Grade exists
    grade_res = await db.execute(select(Grade).filter(Grade.id == payload.grade_id))
    grade = grade_res.scalars().first()
    if not grade:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Grade not found")
        
    # Check if student is already enrolled (enforce unique active enrolment)
    exist_res = await db.execute(
        select(StudentEnrolment).filter(StudentEnrolment.student_id == payload.student_id)
    )
    if exist_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student is already enrolled in a Grade")
        
    enrolment = StudentEnrolment(
        student_id=payload.student_id,
        grade_id=payload.grade_id
    )
    db.add(enrolment)
    await db.commit()
    await db.refresh(enrolment)
    
    return EnrolmentResponse(
        id=enrolment.id,
        student_id=enrolment.student_id,
        grade_id=enrolment.grade_id,
        enrolled_at=enrolment.enrolled_at,
        student_name=student.name,
        grade_name=grade.name
    )


@router.delete("/enrolments/{id}")
async def delete_enrolment(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(select(StudentEnrolment).filter(StudentEnrolment.id == id))
    enrolment = result.scalars().first()
    if not enrolment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrolment not found")
        
    await db.delete(enrolment)
    await db.commit()
    return {"status": "success", "message": "Enrolment removed successfully"}


# --- TIMETABLE SLOTS (ADMIN ONLY) ---

@router.get("/timetables", response_model=list[TimetableSlotResponse])
async def list_timetables(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(
        select(TimetableSlot)
        .options(joinedload(TimetableSlot.course))
    )
    slots = result.scalars().all()
    
    response = []
    for s in slots:
        response.append(
            TimetableSlotResponse(
                id=s.id,
                course_id=s.course_id,
                course_name=s.course.name,
                course_code=s.course.code,
                day_of_week=s.day_of_week,
                start_time=s.start_time,
                end_time=s.end_time,
                room=s.room
            )
        )
    return response


@router.post("/timetables", response_model=TimetableSlotResponse, status_code=status.HTTP_201_CREATED)
async def create_timetable_slot(
    payload: TimetableSlotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    # Fetch Course with teacher/grade details
    course_res = await db.execute(
        select(Course).filter(Course.id == payload.course_id)
    )
    course = course_res.scalars().first()
    if not course:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course not found")
        
    # --- OVERLAP / CONFLICT CHECKS ---
    # Overlap Formula: (start_A < end_B) AND (end_A > start_B)
    
    # 1. Room Conflict
    room_conflict_res = await db.execute(
        select(TimetableSlot).filter(
            TimetableSlot.day_of_week == payload.day_of_week,
            TimetableSlot.room == payload.room,
            TimetableSlot.start_time < payload.end_time,
            TimetableSlot.end_time > payload.start_time
        )
    )
    if room_conflict_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room is already booked for this time slot")
        
    # 2. Teacher Conflict
    if course.teacher_id is not None:
        teacher_conflict_res = await db.execute(
            select(TimetableSlot)
            .join(Course)
            .filter(
                TimetableSlot.day_of_week == payload.day_of_week,
                Course.teacher_id == course.teacher_id,
                TimetableSlot.start_time < payload.end_time,
                TimetableSlot.end_time > payload.start_time
            )
        )
        if teacher_conflict_res.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Teacher is already scheduled for another class in this time slot")
            
    # 3. Grade/Class Conflict
    grade_conflict_res = await db.execute(
        select(TimetableSlot)
        .join(Course)
        .filter(
            TimetableSlot.day_of_week == payload.day_of_week,
            Course.grade_id == course.grade_id,
            TimetableSlot.start_time < payload.end_time,
            TimetableSlot.end_time > payload.start_time
        )
    )
    if grade_conflict_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This Grade already has another class scheduled in this time slot")
        
    slot = TimetableSlot(
        course_id=payload.course_id,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room
    )
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    
    return TimetableSlotResponse(
        id=slot.id,
        course_id=slot.course_id,
        course_name=course.name,
        course_code=course.code,
        day_of_week=slot.day_of_week,
        start_time=slot.start_time,
        end_time=slot.end_time,
        room=slot.room
    )


@router.delete("/timetables/{id}")
async def delete_timetable_slot(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(select(TimetableSlot).filter(TimetableSlot.id == id))
    slot = result.scalars().first()
    if not slot:
        raise HTTPException(status_code=status.HTTP_440_NOT_FOUND, detail="Timetable slot not found")
        
    await db.delete(slot)
    await db.commit()
    return {"status": "success", "message": "Timetable slot removed successfully"}


# --- EXAM SCHEDULES (ADMIN ONLY) ---

@router.get("/exams", response_model=list[ExamScheduleResponse])
async def list_exams(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(
        select(ExamSchedule)
        .options(joinedload(ExamSchedule.course))
    )
    exams = result.scalars().all()
    
    response = []
    for ex in exams:
        response.append(
            ExamScheduleResponse(
                id=ex.id,
                course_id=ex.course_id,
                course_name=ex.course.name,
                name=ex.name,
                exam_date=ex.exam_date,
                start_time=ex.start_time,
                end_time=ex.end_time,
                room=ex.room
            )
        )
    return response


@router.post("/exams", response_model=ExamScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    payload: ExamScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    # Verify Course
    course_res = await db.execute(select(Course).filter(Course.id == payload.course_id))
    course = course_res.scalars().first()
    if not course:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course not found")
        
    # Verify Exam Overlap (Same Room, Date, and Time range)
    overlap_res = await db.execute(
        select(ExamSchedule).filter(
            ExamSchedule.exam_date == payload.exam_date,
            ExamSchedule.room == payload.room,
            ExamSchedule.start_time < payload.end_time,
            ExamSchedule.end_time > payload.start_time
        )
    )
    if overlap_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exam room is already booked for this date and time slot")
        
    exam = ExamSchedule(
        course_id=payload.course_id,
        name=payload.name,
        exam_date=payload.exam_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room
    )
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    
    return ExamScheduleResponse(
        id=exam.id,
        course_id=exam.course_id,
        course_name=course.name,
        name=exam.name,
        exam_date=exam.exam_date,
        start_time=exam.start_time,
        end_time=exam.end_time,
        room=exam.room
    )


@router.delete("/exams/{id}")
async def delete_exam(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(select(ExamSchedule).filter(ExamSchedule.id == id))
    exam = result.scalars().first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam schedule not found")
        
    await db.delete(exam)
    await db.commit()
    return {"status": "success", "message": "Exam schedule cancelled successfully"}


# --- STUDENT TIMETABLE VIEW (STUDENT ONLY) ---

@router.get("/student/timetable", response_model=StudentTimetableData)
async def get_student_timetable(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(student_required),
    _ = Depends(check_payment_standing)
):
    # 1. Fetch Student's enrolment mapping
    enrol_res = await db.execute(
        select(StudentEnrolment)
        .options(joinedload(StudentEnrolment.grade))
        .filter(StudentEnrolment.student_id == current_user.id)
    )
    enrolment = enrol_res.scalars().first()
    if not enrolment:
        return StudentTimetableData(grade=None, timetable=[], exams=[])
        
    grade = enrolment.grade
    
    # 2. Fetch all courses under this grade
    course_res = await db.execute(
        select(Course).filter(Course.grade_id == grade.id)
    )
    courses = course_res.scalars().all()
    course_ids = [c.id for c in courses]
    
    if not course_ids:
        return StudentTimetableData(
            grade=GradeResponse.model_validate(grade),
            timetable=[],
            exams=[]
        )
        
    # 3. Fetch weekly timetable slots for these courses
    slots_res = await db.execute(
        select(TimetableSlot)
        .options(joinedload(TimetableSlot.course))
        .filter(TimetableSlot.course_id.in_(course_ids))
    )
    slots = slots_res.scalars().all()
    
    timetable_response = []
    for s in slots:
        timetable_response.append(
            TimetableSlotResponse(
                id=s.id,
                course_id=s.course_id,
                course_name=s.course.name,
                course_code=s.course.code,
                day_of_week=s.day_of_week,
                start_time=s.start_time,
                end_time=s.end_time,
                room=s.room
            )
        )
        
    # 4. Fetch upcoming exam schedules for these courses
    exams_res = await db.execute(
        select(ExamSchedule)
        .options(joinedload(ExamSchedule.course))
        .filter(ExamSchedule.course_id.in_(course_ids))
    )
    exams = exams_res.scalars().all()
    
    exams_response = []
    for ex in exams:
        exams_response.append(
            ExamScheduleResponse(
                id=ex.id,
                course_id=ex.course_id,
                course_name=ex.course.name,
                name=ex.name,
                exam_date=ex.exam_date,
                start_time=ex.start_time,
                end_time=ex.end_time,
                room=ex.room
            )
        )
        
    return StudentTimetableData(
        grade=GradeResponse.model_validate(grade),
        timetable=timetable_response,
        exams=exams_response
    )


# --- TRANSCRIPTS & GRADES ---

@router.post("/course-grades", response_model=CourseGradeResponse, status_code=status.HTTP_201_CREATED)
async def create_course_grade(
    payload: CourseGradeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_or_teacher_required)
):
    # Verify student exists and has student role
    student_res = await db.execute(
        select(User).filter(User.id == payload.student_id, User.role == UserRole.STUDENT.value)
    )
    student = student_res.scalars().first()
    if not student:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target user is not a Student")
        
    # Verify Course exists
    course_res = await db.execute(select(Course).filter(Course.id == payload.course_id))
    course = course_res.scalars().first()
    if not course:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course not found")

    # Check if grade already exists for student and course (update it if so)
    grade_res = await db.execute(
        select(CourseGrade).filter(
            CourseGrade.student_id == payload.student_id,
            CourseGrade.course_id == payload.course_id
        )
    )
    grade = grade_res.scalars().first()
    if grade:
        grade.grade_value = payload.grade_value
        grade.gpa_points = payload.gpa_points
        grade.graded_at = datetime.utcnow()
    else:
        grade = CourseGrade(
            student_id=payload.student_id,
            course_id=payload.course_id,
            grade_value=payload.grade_value,
            gpa_points=payload.gpa_points
        )
    db.add(grade)
    await db.commit()
    await db.refresh(grade)
    return grade


async def compile_student_transcript(student_id: int, student_name: str, db: AsyncSession):
    stmt = (
        select(CourseGrade, Course)
        .join(Course, CourseGrade.course_id == Course.id)
        .filter(CourseGrade.student_id == student_id)
    )
    result = await db.execute(stmt)
    records = result.all()
    
    total_points = 0.0
    total_credits = 0
    grades_list = []
    
    for grade_record, course_record in records:
        credits = course_record.credits
        total_points += grade_record.gpa_points * credits
        total_credits += credits
        grades_list.append(
            TranscriptGradeItem(
                course_id=course_record.id,
                course_name=course_record.name,
                course_code=course_record.code,
                credits=credits,
                grade_value=grade_record.grade_value,
                gpa_points=grade_record.gpa_points
            )
        )
        
    gpa = (total_points / total_credits) if total_credits > 0 else 0.0
    return StudentTranscriptResponse(
        student_id=student_id,
        student_name=student_name,
        cumulative_gpa=round(gpa, 2),
        grades=grades_list
    )


@router.get("/student/transcript", response_model=StudentTranscriptResponse)
async def get_student_transcript_self(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(student_required),
    _ = Depends(check_payment_standing)
):
    return await compile_student_transcript(current_user.id, current_user.name, db)


@router.get("/grades/student/{student_id}", response_model=StudentTranscriptResponse)
async def get_student_transcript_admin(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_or_teacher_required)
):
    # Verify student exists
    student_res = await db.execute(
        select(User).filter(User.id == student_id, User.role == UserRole.STUDENT.value)
    )
    student = student_res.scalars().first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        
    return await compile_student_transcript(student.id, student.name, db)

