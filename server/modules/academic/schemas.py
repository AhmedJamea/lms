from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional, List

# --- Grades ---
class GradeBase(BaseModel):
    name: str = Field(..., max_length=255, description="Grade name, e.g. Grade 10-A")
    level: int = Field(..., ge=1, description="Numeric grade level")
    academic_year: str = Field(..., max_length=50, description="Academic year, e.g. 2026-2027")

class GradeCreate(GradeBase):
    pass

class GradeResponse(GradeBase):
    id: int
    
    model_config = {
        "from_attributes": True
    }

# --- Enrolment ---
class EnrolmentCreate(BaseModel):
    student_id: int
    grade_id: int

class EnrolmentResponse(BaseModel):
    id: int
    student_id: int
    grade_id: int
    enrolled_at: datetime
    student_name: str
    grade_name: str

    model_config = {
        "from_attributes": True
    }

# --- Courses ---
class CourseCreate(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=50)
    grade_id: int
    teacher_id: Optional[int] = None

class CourseUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    grade_id: Optional[int] = None
    teacher_id: Optional[int] = None

class CourseResponse(BaseModel):
    id: int
    name: str
    code: str
    grade_id: int
    grade_name: str
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None

    model_config = {
        "from_attributes": True
    }

# --- Timetable Slots ---
class TimetableSlotCreate(BaseModel):
    course_id: int
    day_of_week: str = Field(..., max_length=50)
    start_time: str = Field(..., pattern=r"^[0-2][0-9]:[0-5][0-9]$")
    end_time: str = Field(..., pattern=r"^[0-2][0-9]:[0-5][0-9]$")
    room: str = Field(..., max_length=100)

class TimetableSlotResponse(BaseModel):
    id: int
    course_id: int
    course_name: str
    course_code: str
    day_of_week: str
    start_time: str
    end_time: str
    room: str

    model_config = {
        "from_attributes": True
    }

# --- Exam Schedules ---
class ExamScheduleCreate(BaseModel):
    course_id: int
    name: str = Field(..., max_length=255)
    exam_date: date
    start_time: str = Field(..., pattern=r"^[0-2][0-9]:[0-5][0-9]$")
    end_time: str = Field(..., pattern=r"^[0-2][0-9]:[0-5][0-9]$")
    room: str = Field(..., max_length=100)

class ExamScheduleResponse(BaseModel):
    id: int
    course_id: int
    course_name: str
    name: str
    exam_date: date
    start_time: str
    end_time: str
    room: str

    model_config = {
        "from_attributes": True
    }

# --- Student Timetable View ---
class StudentTimetableData(BaseModel):
    grade: Optional[GradeResponse] = None
    timetable: List[TimetableSlotResponse] = []
    exams: List[ExamScheduleResponse] = []

# --- Course Grades ---
class CourseGradeCreate(BaseModel):
    student_id: int
    course_id: int
    grade_value: str = Field(..., max_length=10)
    gpa_points: float = Field(..., ge=0.0, le=4.0)

class CourseGradeResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    grade_value: str
    gpa_points: float
    graded_at: datetime

    model_config = {
        "from_attributes": True
    }

class TranscriptGradeItem(BaseModel):
    course_id: int
    course_name: str
    course_code: str
    credits: int
    grade_value: str
    gpa_points: float

class StudentTranscriptResponse(BaseModel):
    student_id: int
    student_name: str
    cumulative_gpa: float
    grades: List[TranscriptGradeItem]
