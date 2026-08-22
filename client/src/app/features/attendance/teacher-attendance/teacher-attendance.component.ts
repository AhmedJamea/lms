import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AcademicService } from '../../../core/services/academic.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  CourseRosterResponse,
  RosterStudentItem,
  AttendanceStatus,
} from '../../../core/models/attendance.model';
import { Course } from '../../../core/models/academic.model';

@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="attendance-section fade-in">
      <!-- Header -->
      <div class="section-header">
        <div>
          <h3>Class Attendance Roster</h3>
          <p class="sub">Select a course and date, then mark each student's status.</p>
        </div>
        <button
          id="save-attendance-btn"
          class="btn btn-primary"
          [disabled]="!roster() || saving()"
          (click)="saveAttendance()"
        >
          <span *ngIf="!saving()">💾 Save Attendance</span>
          <span *ngIf="saving()">Saving…</span>
        </button>
      </div>

      <!-- Controls Bar -->
      <div class="controls-bar glass-panel">
        <div class="control-group">
          <label for="courseSelect">Course</label>
          <select
            id="courseSelect"
            class="form-control"
            [(ngModel)]="selectedCourseId"
            (change)="onCourseChange()"
          >
            <option value="">— Select a course —</option>
            <option *ngFor="let c of courses()" [value]="c.id">
              {{ c.code }} — {{ c.name }}
            </option>
          </select>
        </div>

        <div class="control-group">
          <label for="dateInput">Date</label>
          <input
            id="dateInput"
            type="date"
            class="form-control"
            [(ngModel)]="selectedDate"
            [max]="today"
            (change)="onDateChange()"
          />
        </div>

        <div class="control-group quick-fill">
          <label>Quick Fill</label>
          <div class="quick-fill-btns">
            <button class="btn-pill present" (click)="fillAll('PRESENT')">All Present</button>
            <button class="btn-pill absent" (click)="fillAll('ABSENT')">All Absent</button>
          </div>
        </div>
      </div>

      <!-- Loading / Error states -->
      <div *ngIf="loading()" class="state-msg">
        <div class="spinner"></div>
        <span>Loading roster…</span>
      </div>

      <div *ngIf="errorMsg()" class="alert-error">
        ⚠ {{ errorMsg() }}
      </div>

      <div *ngIf="successMsg()" class="alert-success">
        ✓ {{ successMsg() }}
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading() && !roster() && !errorMsg()" class="empty-state glass-panel">
        <div class="empty-icon">📋</div>
        <p>Choose a course and date above to load the student roster.</p>
      </div>

      <!-- Roster Table -->
      <div *ngIf="!loading() && roster()" class="glass-panel roster-panel">
        <div class="roster-meta">
          <span class="meta-badge">
            {{ roster()!.date | date:'EEEE, d MMMM yyyy' }}
          </span>
          <span class="count-badge">{{ roster()!.roster.length }} students</span>
        </div>

        <table class="data-table roster-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th class="status-col">Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of draftRoster(); let i = index" [class]="'row-' + (row.status ?? 'none')">
              <td class="row-num">{{ i + 1 }}</td>
              <td class="student-name">
                {{ row.first_name }} {{ row.last_name }}
              </td>
              <td class="status-col">
                <div class="status-pills" [attr.data-student-id]="row.student_id">
                  <button
                    *ngFor="let s of statuses"
                    class="pill"
                    [class]="'pill-' + s.toLowerCase()"
                    [class.selected]="row.status === s"
                    [id]="'status-' + row.student_id + '-' + s"
                    (click)="setStatus(row, s)"
                  >{{ s }}</button>
                </div>
              </td>
              <td>
                <input
                  type="text"
                  class="remarks-input form-control"
                  [(ngModel)]="row.remarks"
                  placeholder="Optional note…"
                  [id]="'remarks-' + row.student_id"
                />
              </td>
            </tr>
            <tr *ngIf="roster()!.roster.length === 0">
              <td colspan="4" class="empty-row">No students enrolled in this course.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .attendance-section {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .section-header h3 { margin: 0 0 0.25rem; }
    .sub {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    /* Controls */
    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      padding: 1.25rem 1.5rem;
      align-items: flex-end;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-width: 200px;
    }

    .control-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .quick-fill { min-width: auto; }
    .quick-fill-btns { display: flex; gap: 0.5rem; }

    .btn-pill {
      border: none;
      border-radius: 9999px;
      padding: 0.4rem 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .btn-pill:hover { opacity: 0.8; }

    .btn-pill.present {
      background: rgba(52, 211, 153, 0.2);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.4);
    }

    .btn-pill.absent {
      background: rgba(248, 113, 113, 0.2);
      color: #f87171;
      border: 1px solid rgba(248, 113, 113, 0.4);
    }

    /* State messages */
    .state-msg {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--text-secondary);
      padding: 1rem;
    }

    .spinner {
      width: 20px; height: 20px;
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: #818cf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .alert-error {
      padding: 0.85rem 1rem;
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.3);
      border-radius: 8px;
      color: #f87171;
      font-size: 0.9rem;
    }

    .alert-success {
      padding: 0.85rem 1rem;
      background: rgba(52, 211, 153, 0.1);
      border: 1px solid rgba(52, 211, 153, 0.3);
      border-radius: 8px;
      color: #34d399;
      font-size: 0.9rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      min-height: 260px;
      color: var(--text-secondary);
    }

    .empty-icon { font-size: 3rem; opacity: 0.5; }

    /* Roster panel */
    .roster-panel { padding: 1.5rem; }

    .roster-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .meta-badge {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .count-badge {
      background: rgba(255,255,255,0.05);
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .roster-table .row-num { color: var(--text-secondary); font-size: 0.85rem; }

    .student-name { font-weight: 500; }

    /* Status pills */
    .status-col { min-width: 280px; }

    .status-pills {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .pill {
      border: 1px solid transparent;
      border-radius: 9999px;
      padding: 0.25rem 0.7rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      opacity: 0.45;
      transition: opacity 0.15s, background 0.15s;
      background: rgba(255,255,255,0.04);
      color: var(--text-secondary);
    }

    .pill:hover { opacity: 0.8; }

    .pill.selected { opacity: 1; }

    .pill-present.selected  { background: rgba(52,211,153,0.2); color: #34d399; border-color: rgba(52,211,153,0.5); }
    .pill-absent.selected   { background: rgba(248,113,113,0.2); color: #f87171; border-color: rgba(248,113,113,0.5); }
    .pill-late.selected     { background: rgba(251,191,36,0.2);  color: #fbbf24; border-color: rgba(251,191,36,0.5); }
    .pill-excused.selected  { background: rgba(96,165,250,0.2);  color: #60a5fa; border-color: rgba(96,165,250,0.5); }

    /* Row tinting */
    .row-ABSENT   td { background: rgba(248,113,113,0.04); }
    .row-LATE     td { background: rgba(251,191,36,0.04); }
    .row-EXCUSED  td { background: rgba(96,165,250,0.04); }

    .remarks-input {
      background: rgba(15,23,42,0.5);
      font-size: 0.85rem;
      padding: 0.4rem 0.7rem;
      min-width: 160px;
    }

    .empty-row {
      text-align: center;
      color: var(--text-secondary);
      padding: 2rem 0;
    }

    .fade-in {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class TeacherAttendanceComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private academicService = inject(AcademicService);
  private authService = inject(AuthService);

  readonly statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
  readonly today = new Date().toISOString().split('T')[0];

  // Bound to template controls
  selectedCourseId: number | string = '';
  selectedDate: string = this.today;

  // Signals
  courses = signal<Course[]>([]);
  roster = signal<CourseRosterResponse | null>(null);
  draftRoster = signal<(RosterStudentItem & { status: AttendanceStatus | null; remarks: string | null })[]>([]);
  loading = signal(false);
  saving = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCourses();
  }

  private loadCourses(): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    this.academicService.getCourses().subscribe({
      next: (all) => {
        // Teachers see only their assigned courses; admins see all
        const filtered =
          currentUser.role === 'TEACHER'
            ? all.filter((c) => c.teacher_id === currentUser.id)
            : all;
        this.courses.set(filtered);
      },
      error: () => this.errorMsg.set('Failed to load courses.')
    });
  }

  onCourseChange(): void {
    if (this.selectedCourseId) this.fetchRoster();
    else this.roster.set(null);
  }

  onDateChange(): void {
    if (this.selectedCourseId) this.fetchRoster();
  }

  private fetchRoster(): void {
    const courseId = Number(this.selectedCourseId);
    if (!courseId) return;

    this.loading.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.roster.set(null);

    this.attendanceService.getCourseRoster(courseId, this.selectedDate).subscribe({
      next: (data) => {
        this.roster.set(data);
        // Build an editable draft from the roster
        this.draftRoster.set(
          data.roster.map((s) => ({
            ...s,
            status: (s.status as AttendanceStatus | null) ?? null,
            remarks: s.remarks ?? null,
          }))
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.detail ?? 'Failed to load roster.');
        this.loading.set(false);
      }
    });
  }

  setStatus(row: RosterStudentItem & { status: AttendanceStatus | null }, status: AttendanceStatus): void {
    row.status = status;
    // Trigger change detection on the signal array
    this.draftRoster.set([...this.draftRoster()]);
  }

  fillAll(status: AttendanceStatus): void {
    this.draftRoster.set(this.draftRoster().map((r) => ({ ...r, status })));
  }

  saveAttendance(): void {
    const courseId = Number(this.selectedCourseId);
    const draft = this.draftRoster();

    const unmarked = draft.filter((r) => !r.status);
    if (unmarked.length > 0) {
      this.errorMsg.set(
        `Please mark a status for all students. ${unmarked.length} student(s) still unmarked.`
      );
      return;
    }

    this.saving.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    const payload = {
      records: draft.map((r) => ({
        student_id: r.student_id,
        status: r.status!,
        remarks: r.remarks ?? undefined,
      })),
    };

    this.attendanceService.saveAttendance(courseId, payload, this.selectedDate).subscribe({
      next: (res) => {
        this.successMsg.set(`${res.message} (${res.count} record(s) saved).`);
        this.saving.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.detail ?? 'Failed to save attendance.');
        this.saving.set(false);
      }
    });
  }
}
