import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CourseRosterResponse,
  AttendanceLogRequest,
  AttendanceLogResponse,
  StudentAttendanceSummaryResponse,
  StaffAbsenceCreate,
  StaffAbsenceResponse,
  StaffAbsenceLogResponse,
} from '../models/attendance.model';

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api/v1/attendance';

  constructor(private http: HttpClient) {}

  // ── US1: Teacher – Roster & Save ────────────────────────────────────────────

  /**
   * Fetch the student roster for a course on a given date.
   * If `date` is omitted the backend defaults to today.
   */
  getCourseRoster(courseId: number, date?: string): Observable<CourseRosterResponse> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date_val', date);
    }
    return this.http.get<CourseRosterResponse>(
      `${this.baseUrl}/courses/${courseId}/roster`,
      { params }
    );
  }

  /**
   * Persist attendance records for a course.
   * `date` is an ISO date string (YYYY-MM-DD); defaults to today on the server.
   */
  saveAttendance(
    courseId: number,
    payload: AttendanceLogRequest,
    date?: string
  ): Observable<AttendanceLogResponse> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date_val', date);
    }
    return this.http.post<AttendanceLogResponse>(
      `${this.baseUrl}/courses/${courseId}`,
      payload,
      { params }
    );
  }

  // ── US2: Student – Personal Summary ─────────────────────────────────────────

  /** Fetch the authenticated student's own attendance summary. */
  getMyAttendanceSummary(): Observable<StudentAttendanceSummaryResponse> {
    return this.http.get<StudentAttendanceSummaryResponse>(
      `${this.baseUrl}/student/my-summary`
    );
  }

  /**
   * Admin/Teacher view of any student's attendance summary by student ID.
   */
  getStudentAttendanceSummary(
    studentId: number
  ): Observable<StudentAttendanceSummaryResponse> {
    return this.http.get<StudentAttendanceSummaryResponse>(
      `${this.baseUrl}/student/${studentId}/summary`
    );
  }

  // ── US3: Admin – Staff Absences CRUD ────────────────────────────────────────

  /**
   * Fetch all staff absence records.
   * Both `date` and `userId` are optional server-side filters.
   */
  getStaffAbsences(
    date?: string,
    userId?: number
  ): Observable<StaffAbsenceResponse[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date_val', date);
    }
    if (userId !== undefined) {
      params = params.set('user_id', userId.toString());
    }
    return this.http.get<StaffAbsenceResponse[]>(
      `${this.baseUrl}/staff/absences`,
      { params }
    );
  }

  /** Log a new staff absence. */
  createStaffAbsence(
    payload: StaffAbsenceCreate
  ): Observable<StaffAbsenceLogResponse> {
    return this.http.post<StaffAbsenceLogResponse>(
      `${this.baseUrl}/staff/absences`,
      payload
    );
  }

  /** Delete a staff absence record by ID. */
  deleteStaffAbsence(absenceId: number): Observable<{ status: string; message: string }> {
    return this.http.delete<{ status: string; message: string }>(
      `${this.baseUrl}/staff/absences/${absenceId}`
    );
  }
}
