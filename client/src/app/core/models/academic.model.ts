export interface Grade {
  id: number;
  name: string;
  level: number;
  academic_year: string;
}

export interface Enrolment {
  id: number;
  student_id: number;
  grade_id: number;
  enrolled_at: string;
  student_name: string;
  grade_name: string;
}

export interface Course {
  id: number;
  name: string;
  code: string;
  grade_id: number;
  grade_name: string;
  teacher_id?: number | null;
  teacher_name?: string | null;
}

export interface TimetableSlot {
  id: number;
  course_id: number;
  course_name: string;
  course_code: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
}

export interface ExamSchedule {
  id: number;
  course_id: number;
  course_name: string;
  name: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
}

export interface StudentTimetableData {
  grade: Grade | null;
  timetable: TimetableSlot[];
  exams: ExamSchedule[];
}

export interface CourseGrade {
  id?: number;
  student_id: number;
  course_id: number;
  grade_value: string;
  gpa_points: number;
  graded_at?: string;
}

export interface TranscriptGradeItem {
  course_id: number;
  course_name: string;
  course_code: string;
  credits: number;
  grade_value: string;
  gpa_points: number;
}

export interface StudentTranscript {
  student_id: number;
  student_name: string;
  cumulative_gpa: number;
  grades: TranscriptGradeItem[];
}
