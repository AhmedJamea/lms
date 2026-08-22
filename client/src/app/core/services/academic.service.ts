import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Grade,
  Enrolment,
  Course,
  TimetableSlot,
  ExamSchedule,
  StudentTimetableData,
  StudentTranscript,
  CourseGrade
} from '../models/academic.model';

@Injectable({
  providedIn: 'root'
})
export class AcademicService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api/v1/academic';

  constructor(private http: HttpClient) {}

  // --- Grade Methods ---
  getGrades(): Observable<Grade[]> {
    return this.http.get<Grade[]>(`${this.baseUrl}/grades`);
  }

  createGrade(grade: { name: string; level: number; academic_year: string }): Observable<Grade> {
    return this.http.post<Grade>(`${this.baseUrl}/grades`, grade);
  }

  updateGrade(id: number, grade: { name: string; level: number; academic_year: string }): Observable<Grade> {
    return this.http.put<Grade>(`${this.baseUrl}/grades/${id}`, grade);
  }

  deleteGrade(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/grades/${id}`);
  }

  // --- Enrolment Methods ---
  getEnrolments(): Observable<Enrolment[]> {
    return this.http.get<Enrolment[]>(`${this.baseUrl}/enrolments`);
  }

  createEnrolment(enrolment: { student_id: number; grade_id: number }): Observable<Enrolment> {
    return this.http.post<Enrolment>(`${this.baseUrl}/enrolments`, enrolment);
  }

  deleteEnrolment(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/enrolments/${id}`);
  }

  // --- Course Methods ---
  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.baseUrl}/courses`);
  }

  createCourse(course: { name: string; code: string; grade_id: number; teacher_id?: number | null }): Observable<Course> {
    return this.http.post<Course>(`${this.baseUrl}/courses`, course);
  }

  updateCourse(id: number, course: { name?: string; code?: string; grade_id?: number; teacher_id?: number | null }): Observable<Course> {
    return this.http.put<Course>(`${this.baseUrl}/courses/${id}`, course);
  }

  deleteCourse(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/courses/${id}`);
  }

  // --- Timetable Slots ---
  getTimetableSlots(): Observable<TimetableSlot[]> {
    return this.http.get<TimetableSlot[]>(`${this.baseUrl}/timetables`);
  }

  createTimetableSlot(slot: { course_id: number; day_of_week: string; start_time: string; end_time: string; room: string }): Observable<TimetableSlot> {
    return this.http.post<TimetableSlot>(`${this.baseUrl}/timetables`, slot);
  }

  deleteTimetableSlot(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/timetables/${id}`);
  }

  // --- Exam Schedules ---
  getExams(): Observable<ExamSchedule[]> {
    return this.http.get<ExamSchedule[]>(`${this.baseUrl}/exams`);
  }

  createExam(exam: { course_id: number; name: string; exam_date: string; start_time: string; end_time: string; room: string }): Observable<ExamSchedule> {
    return this.http.post<ExamSchedule>(`${this.baseUrl}/exams`, exam);
  }

  deleteExam(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/exams/${id}`);
  }

  // --- Student Timetable ---
  getStudentTimetable(): Observable<StudentTimetableData> {
    return this.http.get<StudentTimetableData>(`${this.baseUrl}/student/timetable`);
  }

  // --- Transcripts & Grades ---
  getStudentTranscript(): Observable<StudentTranscript> {
    return this.http.get<StudentTranscript>(`${this.baseUrl}/student/transcript`);
  }

  getStudentTranscriptAdmin(studentId: number): Observable<StudentTranscript> {
    return this.http.get<StudentTranscript>(`${this.baseUrl}/grades/student/${studentId}`);
  }

  createCourseGrade(grade: { student_id: number; course_id: number; grade_value: string; gpa_points: number }): Observable<CourseGrade> {
    return this.http.post<CourseGrade>(`${this.baseUrl}/course-grades`, grade);
  }
}
