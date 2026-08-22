// === US1 & US2: Student Attendance ===

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

/** One student row inside a course roster response */
export interface RosterStudentItem {
  student_id: number;
  first_name: string;
  last_name: string;
  status: AttendanceStatus | null;
  remarks: string | null;
}

/** GET /attendance/courses/:id/roster */
export interface CourseRosterResponse {
  course_id: number;
  date: string; // ISO date string e.g. "2026-06-14"
  roster: RosterStudentItem[];
}

/** Single record inside the save-attendance payload */
export interface StudentAttendanceRecordInput {
  student_id: number;
  status: AttendanceStatus;
  remarks?: string | null;
}

/** POST /attendance/courses/:id  – request body */
export interface AttendanceLogRequest {
  records: StudentAttendanceRecordInput[];
}

/** POST /attendance/courses/:id  – response */
export interface AttendanceLogResponse {
  status: string;
  message: string;
  count: number;
}

// === US2: Student Attendance Summary ===

/** Per-course breakdown inside the student summary */
export interface CourseAttendanceSummary {
  course_id: number;
  course_name: string;
  absences: number;
  late: number;
  excused: number;
}

/** Single history row inside the student summary */
export interface StudentAttendanceHistoryItem {
  course_name: string;
  date: string; // ISO date string
  status: AttendanceStatus;
  remarks: string | null;
}

/** GET /attendance/student/my-summary  –  GET /attendance/student/:id/summary */
export interface StudentAttendanceSummaryResponse {
  student_id: number;
  total_absences: number;
  total_late: number;
  total_excused: number;
  course_summaries: CourseAttendanceSummary[];
  history: StudentAttendanceHistoryItem[];
}

// === US3: Staff Absence Tracking ===

/** POST /attendance/staff/absences – request body */
export interface StaffAbsenceCreate {
  user_id: number;
  date: string; // ISO date string
  reason?: string | null;
  is_excused: boolean;
}

/** GET /attendance/staff/absences – single record */
export interface StaffAbsenceResponse {
  absence_id: number;
  user_id: number;
  name: string;
  role: string;
  date: string; // ISO date string
  reason: string | null;
  is_excused: boolean;
  recorded_by_name: string | null;
}

/** POST /attendance/staff/absences – response */
export interface StaffAbsenceLogResponse {
  absence_id: number;
  status: string;
  message: string;
}
