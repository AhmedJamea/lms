import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicService } from '../../../core/services/academic.service';
import { Course, TimetableSlot, ExamSchedule } from '../../../core/models/academic.model';

@Component({
  selector: 'app-exam-scheduling',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="academic-section fade-in">
      <!-- Top Tab Navigation -->
      <div class="scheduler-tabs">
        <button
          class="tab-btn"
          [class.active]="activeScheduleTab() === 'timetable'"
          (click)="setScheduleTab('timetable')"
        >
          Weekly Class Schedules
        </button>
        <button
          class="tab-btn"
          [class.active]="activeScheduleTab() === 'exams'"
          (click)="setScheduleTab('exams')"
        >
          Course Exam Timetables
        </button>
      </div>

      <!-- 1. WEEKLY CLASS TIMETABLE PANEL -->
      <div *ngIf="activeScheduleTab() === 'timetable'" class="glass-panel card fade-in">
        <div class="panel-header">
          <h4>Weekly Timetable Slots</h4>
          <button class="btn btn-primary btn-sm" (click)="openSlotModal()">Schedule Class Time</button>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Code</th>
              <th>Day</th>
              <th>Time Range</th>
              <th>Room</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let slot of slots()">
              <td>{{ slot.course_name }}</td>
              <td><span class="code-badge">{{ slot.course_code }}</span></td>
              <td>{{ slot.day_of_week }}</td>
              <td>{{ slot.start_time }} - {{ slot.end_time }}</td>
              <td><span class="room-badge">{{ slot.room }}</span></td>
              <td>
                <button class="btn btn-danger btn-sm" (click)="deleteSlot(slot.id)">Remove</button>
              </td>
            </tr>
            <tr *ngIf="slots().length === 0">
              <td colspan="6" class="text-center">No class times scheduled.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 2. COURSE EXAMS TIMETABLE PANEL -->
      <div *ngIf="activeScheduleTab() === 'exams'" class="glass-panel card fade-in">
        <div class="panel-header">
          <h4>Scheduled Exams</h4>
          <button class="btn btn-primary btn-sm" (click)="openExamModal()">Schedule Course Exam</button>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Exam Name</th>
              <th>Course</th>
              <th>Date</th>
              <th>Time Range</th>
              <th>Room</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let ex of exams()">
              <td><strong>{{ ex.name }}</strong></td>
              <td>{{ ex.course_name }}</td>
              <td>{{ ex.exam_date }}</td>
              <td>{{ ex.start_time }} - {{ ex.end_time }}</td>
              <td><span class="room-badge">{{ ex.room }}</span></td>
              <td>
                <button class="btn btn-danger btn-sm" (click)="deleteExam(ex.id)">Cancel Exam</button>
              </td>
            </tr>
            <tr *ngIf="exams().length === 0">
              <td colspan="6" class="text-center">No exams scheduled.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Timetable Slot Modal Overlay -->
    <div *ngIf="showSlotModal()" class="modal-overlay">
      <div class="glass-panel modal-content">
        <h3>Schedule Weekly Class Session</h3>
        <form [formGroup]="slotForm" (ngSubmit)="submitSlotForm()">
          <div class="form-group">
            <label for="slotCourse">Select Course</label>
            <select id="slotCourse" formControlName="course_id" class="form-control">
              <option value="">-- Choose Course --</option>
              <option *ngFor="let c of courses()" [value]="c.id">{{ c.name }} ({{ c.grade_name }})</option>
            </select>
          </div>
          <div class="form-group">
            <label for="slotDay">Day of Week</label>
            <select id="slotDay" formControlName="day_of_week" class="form-control">
              <option value="">-- Choose Day --</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
            </select>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="slotStart">Start Time (HH:MM)</label>
              <input id="slotStart" type="text" formControlName="start_time" class="form-control" placeholder="e.g. 09:00" />
            </div>
            <div class="form-group">
              <label for="slotEnd">End Time (HH:MM)</label>
              <input id="slotEnd" type="text" formControlName="end_time" class="form-control" placeholder="e.g. 10:30" />
            </div>
          </div>
          <div class="form-group">
            <label for="slotRoom">Room Location</label>
            <input id="slotRoom" type="text" formControlName="room" class="form-control" placeholder="e.g. Room 101" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary m-left">Schedule Class</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Exam Modal Overlay -->
    <div *ngIf="showExamModal()" class="modal-overlay">
      <div class="glass-panel modal-content">
        <h3>Schedule Course Exam</h3>
        <form [formGroup]="examForm" (ngSubmit)="submitExamForm()">
          <div class="form-group">
            <label for="examName">Exam Title</label>
            <input id="examName" type="text" formControlName="name" class="form-control" placeholder="e.g. Midterm Examination" />
          </div>
          <div class="form-group">
            <label for="examCourse">Select Course</label>
            <select id="examCourse" formControlName="course_id" class="form-control">
              <option value="">-- Choose Course --</option>
              <option *ngFor="let c of courses()" [value]="c.id">{{ c.name }} ({{ c.grade_name }})</option>
            </select>
          </div>
          <div class="form-group">
            <label for="examDate">Exam Date</label>
            <input id="examDate" type="date" formControlName="exam_date" class="form-control" />
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="examStart">Start Time (HH:MM)</label>
              <input id="examStart" type="text" formControlName="start_time" class="form-control" placeholder="e.g. 10:00" />
            </div>
            <div class="form-group">
              <label for="examEnd">End Time (HH:MM)</label>
              <input id="examEnd" type="text" formControlName="end_time" class="form-control" placeholder="e.g. 12:00" />
            </div>
          </div>
          <div class="form-group">
            <label for="examRoom">Venue Room</label>
            <input id="examRoom" type="text" formControlName="room" class="form-control" placeholder="e.g. Main Hall" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary m-left">Schedule Exam</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .academic-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .scheduler-tabs {
      display: flex;
      gap: 1rem;
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 0.5rem;
    }
    .tab-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1rem;
      font-weight: 500;
      padding: 0.5rem 1rem;
      cursor: pointer;
      border-radius: 6px;
      transition: var(--transition);
      outline: none;
    }
    .tab-btn:hover, .tab-btn.active {
      color: #818cf8;
      background: rgba(99, 102, 241, 0.1);
    }
    .card {
      padding: 1.5rem;
      min-height: 480px;
    }
    .card h4 {
      margin: 0;
      color: #818cf8;
      letter-spacing: 0.05em;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 0.5rem;
    }
    .code-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border-radius: 4px;
    }
    .room-badge {
      font-size: 0.8rem;
      font-weight: 500;
      padding: 0.2rem 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .m-left {
      margin-left: 0.5rem;
    }
    .text-center {
      text-align: center;
      color: var(--text-secondary);
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 2rem;
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
export class ExamSchedulingComponent implements OnInit {
  private academicService = inject(AcademicService);
  private fb = inject(FormBuilder);

  activeScheduleTab = signal<'timetable' | 'exams'>('timetable');
  courses = signal<Course[]>([]);
  slots = signal<TimetableSlot[]>([]);
  exams = signal<ExamSchedule[]>([]);

  showSlotModal = signal(false);
  showExamModal = signal(false);

  slotForm = this.fb.group({
    course_id: ['', Validators.required],
    day_of_week: ['', Validators.required],
    start_time: ['', [Validators.required, Validators.pattern(/^[0-2][0-9]:[0-5][0-9]$/)]],
    end_time: ['', [Validators.required, Validators.pattern(/^[0-2][0-9]:[0-5][0-9]$/)]],
    room: ['', Validators.required]
  });

  examForm = this.fb.group({
    name: ['', Validators.required],
    course_id: ['', Validators.required],
    exam_date: ['', Validators.required],
    start_time: ['', [Validators.required, Validators.pattern(/^[0-2][0-9]:[0-5][0-9]$/)]],
    end_time: ['', [Validators.required, Validators.pattern(/^[0-2][0-9]:[0-5][0-9]$/)]],
    room: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.academicService.getCourses().subscribe({
      next: (data) => this.courses.set(data),
      error: (err) => console.error('Error fetching courses', err)
    });

    this.academicService.getTimetableSlots().subscribe({
      next: (data) => this.slots.set(data),
      error: (err) => console.error('Error fetching slots', err)
    });

    this.academicService.getExams().subscribe({
      next: (data) => this.exams.set(data),
      error: (err) => console.error('Error fetching exams', err)
    });
  }

  setScheduleTab(tab: 'timetable' | 'exams'): void {
    this.activeScheduleTab.set(tab);
  }

  openSlotModal(): void {
    this.slotForm.reset({
      course_id: '',
      day_of_week: '',
      start_time: '',
      end_time: '',
      room: ''
    });
    this.showSlotModal.set(true);
  }

  openExamModal(): void {
    this.examForm.reset({
      name: '',
      course_id: '',
      exam_date: '',
      start_time: '',
      end_time: '',
      room: ''
    });
    this.showExamModal.set(true);
  }

  closeModal(): void {
    this.showSlotModal.set(false);
    this.showExamModal.set(false);
  }

  submitSlotForm(): void {
    if (this.slotForm.invalid) return;

    const slotData = {
      course_id: Number(this.slotForm.value.course_id!),
      day_of_week: this.slotForm.value.day_of_week!,
      start_time: this.slotForm.value.start_time!,
      end_time: this.slotForm.value.end_time!,
      room: this.slotForm.value.room!
    };

    this.academicService.createTimetableSlot(slotData).subscribe({
      next: () => {
        this.closeModal();
        this.loadData();
      },
      error: (err) => alert(err.error?.detail ?? 'Scheduling conflict: Overlapping weekly slot.')
    });
  }

  deleteSlot(id: number): void {
    if (!confirm('Are you sure you want to cancel this weekly class slot?')) return;
    this.academicService.deleteTimetableSlot(id).subscribe({
      next: () => this.loadData(),
      error: (err) => alert(err.error?.detail ?? 'Failed to delete slot')
    });
  }

  submitExamForm(): void {
    if (this.examForm.invalid) return;

    const examData = {
      name: this.examForm.value.name!,
      course_id: Number(this.examForm.value.course_id!),
      exam_date: this.examForm.value.exam_date!,
      start_time: this.examForm.value.start_time!,
      end_time: this.examForm.value.end_time!,
      room: this.examForm.value.room!
    };

    this.academicService.createExam(examData).subscribe({
      next: () => {
        this.closeModal();
        this.loadData();
      },
      error: (err) => alert(err.error?.detail ?? 'Scheduling conflict: Room already booked.')
    });
  }

  deleteExam(id: number): void {
    if (!confirm('Are you sure you want to cancel this scheduled exam?')) return;
    this.academicService.deleteExam(id).subscribe({
      next: () => this.loadData(),
      error: (err) => alert(err.error?.detail ?? 'Failed to cancel exam')
    });
  }
}
