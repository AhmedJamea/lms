from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional, List

# --- Student Attendance (US1 & US2) ---

class RosterStudentItem(BaseModel):
    student_id: int
    first_name: str
    last_name: str
    status: Optional[str] = None
    remarks: Optional[str] = None

    model_config = {
        "from_attributes": True
    }

class CourseRosterResponse(BaseModel):
    course_id: int
    date: date
    roster: List[RosterStudentItem]

class StudentAttendanceRecordInput(BaseModel):
    student_id: int
    status: str = Field(..., description="Status must be PRESENT, ABSENT, LATE, or EXCUSED")
    remarks: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        upper_val = value.upper()
        allowed = {"PRESENT", "ABSENT", "LATE", "EXCUSED"}
        if upper_val not in allowed:
            raise ValueError(f"Status must be one of {allowed}")
        return upper_val

class AttendanceLogRequest(BaseModel):
    records: List[StudentAttendanceRecordInput]

class AttendanceLogResponse(BaseModel):
    status: str
    message: str
    count: int

# --- Student Dashboards (US2) ---

class CourseAttendanceSummary(BaseModel):
    course_id: int
    course_name: str
    absences: int
    late: int
    excused: int

class StudentAttendanceHistoryItem(BaseModel):
    course_name: str
    date: date
    status: str
    remarks: Optional[str] = None

class StudentAttendanceSummaryResponse(BaseModel):
    student_id: int
    total_absences: int
    total_late: int
    total_excused: int
    course_summaries: List[CourseAttendanceSummary]
    history: List[StudentAttendanceHistoryItem]

# --- Staff Absences (US3) ---

class StaffAbsenceCreate(BaseModel):
    user_id: int
    date: date
    reason: Optional[str] = None
    is_excused: bool = False

class StaffAbsenceResponse(BaseModel):
    absence_id: int
    user_id: int
    name: str
    role: str
    date: date
    reason: Optional[str] = None
    is_excused: bool
    recorded_by_name: Optional[str] = None

    model_config = {
        "from_attributes": True
    }

class StaffAbsenceLogResponse(BaseModel):
    absence_id: int
    status: str
    message: str
