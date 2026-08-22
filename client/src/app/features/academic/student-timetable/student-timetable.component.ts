import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AcademicService } from '../../../core/services/academic.service';
import { StudentTimetableData, TimetableSlot } from '../../../core/models/academic.model';

@Component({
  selector: 'app-student-timetable',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timetable-container fade-in">
      <!-- Unenrolled State -->
      <div *ngIf="!enrolled()" class="glass-panel alert-card text-center">
        <div class="alert-icon">⚠️</div>
        <h3>Not Enrolled</h3>
        <p>You are not currently enrolled in any class track. Please contact your administrator to set up your academic profile.</p>
      </div>

      <!-- Enrolled Timetable Dashboard -->
      <div *ngIf="enrolled()" class="timetable-dashboard">
        <div class="dashboard-header glass-panel">
          <h3>My Academic Track: <span class="grade-title">{{ data()?.grade?.name }}</span></h3>
          <p class="session-info">Academic Session: {{ data()?.grade?.academic_year }}</p>
        </div>

        <div class="timetable-content-grid">
          <!-- Weekly Class Schedules -->
          <div class="glass-panel card">
            <h4 class="card-title">Weekly Class Schedule</h4>
            <div class="days-list">
              <div *ngFor="let day of weekDays" class="day-group">
                <div class="day-header">{{ day }}</div>
                <div class="slots-container">
                  <div *ngFor="let slot of getSlotsForDay(day)" class="slot-card">
                    <div class="slot-time">{{ slot.start_time }} - {{ slot.end_time }}</div>
                    <div class="slot-course"><strong>{{ slot.course_name }}</strong></div>
                    <div class="slot-details">
                      <span class="code-lbl">{{ slot.course_code }}</span> | 
                      <span class="room-lbl">📍 {{ slot.room }}</span>
                    </div>
                  </div>
                  <div *ngIf="getSlotsForDay(day).length === 0" class="no-slots">
                    No classes scheduled.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Upcoming Exams -->
          <div class="glass-panel card">
            <h4 class="card-title">Upcoming Examinations</h4>
            <div class="exams-list">
              <div *ngFor="let ex of data()?.exams" class="exam-card">
                <div class="exam-header">
                  <span class="exam-name">{{ ex.name }}</span>
                  <span class="exam-room">📍 {{ ex.room }}</span>
                </div>
                <div class="exam-details">
                  <span class="exam-course">Course: {{ ex.course_name }}</span>
                  <span class="exam-time">📅 {{ ex.exam_date }} ({{ ex.start_time }} - {{ ex.end_time }})</span>
                </div>
              </div>
              <div *ngIf="data()?.exams?.length === 0" class="no-exams">
                No upcoming exams scheduled.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .timetable-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .alert-card {
      padding: 3rem 2rem;
      max-width: 500px;
      margin: 4rem auto;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .alert-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    .alert-card h3 {
      margin-bottom: 0.5rem;
      color: #ef4444;
    }
    .alert-card p {
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .dashboard-header {
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .dashboard-header h3 {
      margin: 0;
      font-size: 1.5rem;
    }
    .grade-title {
      color: #818cf8;
    }
    .session-info {
      color: var(--text-secondary);
      margin-top: 0.25rem;
      font-size: 0.9rem;
    }
    .timetable-content-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 1024px) {
      .timetable-content-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .card {
      padding: 1.5rem;
      min-height: 500px;
    }
    .card-title {
      margin-top: 0;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 0.5rem;
      color: #818cf8;
      letter-spacing: 0.05em;
    }
    .days-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .day-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .day-header {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.95rem;
      border-left: 3px solid #818cf8;
      padding-left: 0.5rem;
    }
    .slots-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-left: 0.75rem;
    }
    .slot-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--panel-border);
      border-radius: 6px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .slot-time {
      font-size: 0.8rem;
      color: #818cf8;
      font-weight: 500;
    }
    .slot-course {
      font-size: 0.95rem;
    }
    .slot-details {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    .code-lbl {
      background: rgba(99, 102, 241, 0.1);
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
    }
    .no-slots, .no-exams {
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-style: italic;
      padding: 0.25rem 0;
    }
    .exams-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .exam-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--panel-border);
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .exam-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .exam-name {
      font-weight: 600;
      color: #ef4444;
    }
    .exam-room {
      font-size: 0.8rem;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.05);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
    }
    .exam-details {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .text-center {
      text-align: center;
    }
    .fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class StudentTimetableComponent implements OnInit {
  private academicService = inject(AcademicService);

  data = signal<StudentTimetableData | null>(null);
  enrolled = signal(false);

  weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  ngOnInit(): void {
    this.academicService.getStudentTimetable().subscribe({
      next: (res) => {
        this.data.set(res);
        this.enrolled.set(res.grade !== null);
      },
      error: (err) => console.error('Error fetching student timetable', err)
    });
  }

  getSlotsForDay(day: string): TimetableSlot[] {
    const slots = this.data()?.timetable ?? [];
    return slots.filter((s) => s.day_of_week === day);
  }
}
