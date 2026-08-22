import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceService } from '../../../core/services/attendance.service';
import {
  StudentAttendanceSummaryResponse,
  StudentAttendanceHistoryItem,
  AttendanceStatus,
} from '../../../core/models/attendance.model';

@Component({
  selector: 'app-student-attendance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="attendance-section fade-in">
      <div class="section-header">
        <div>
          <h3>My Attendance Overview</h3>
          <p class="sub">Read-only summary of your attendance record across all enrolled courses.</p>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="state-msg">
        <div class="spinner"></div><span>Loading your attendance data…</span>
      </div>

      <!-- Error -->
      <div *ngIf="errorMsg()" class="alert-error">⚠ {{ errorMsg() }}</div>

      <!-- Summary stat cards -->
      <div *ngIf="summary()" class="stat-cards">
        <div class="stat-card glass-panel danger">
          <div class="stat-icon">🚫</div>
          <div class="stat-body">
            <span class="stat-value">{{ summary()!.total_absences }}</span>
            <span class="stat-label">Unexcused Absences</span>
          </div>
        </div>

        <div class="stat-card glass-panel warning">
          <div class="stat-icon">⏱</div>
          <div class="stat-body">
            <span class="stat-value">{{ summary()!.total_late }}</span>
            <span class="stat-label">Late Arrivals</span>
          </div>
        </div>

        <div class="stat-card glass-panel info">
          <div class="stat-icon">📝</div>
          <div class="stat-body">
            <span class="stat-value">{{ summary()!.total_excused }}</span>
            <span class="stat-label">Excused Absences</span>
          </div>
        </div>
      </div>

      <!-- Per-course breakdown -->
      <div *ngIf="summary() && summary()!.course_summaries.length > 0" class="glass-panel breakdown-panel">
        <h4>Course Breakdown</h4>
        <div class="breakdown-grid">
          <div
            *ngFor="let cs of summary()!.course_summaries"
            class="course-card glass-panel"
          >
            <div class="course-name">{{ cs.course_name }}</div>
            <div class="course-stats">
              <span class="cstat absent" title="Unexcused absences">
                🚫 {{ cs.absences }}
              </span>
              <span class="cstat late" title="Late arrivals">
                ⏱ {{ cs.late }}
              </span>
              <span class="cstat excused" title="Excused absences">
                📝 {{ cs.excused }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- History table -->
      <div *ngIf="summary()" class="glass-panel history-panel">
        <h4>Attendance History</h4>
        <table class="data-table" *ngIf="summary()!.history.length > 0; else noHistory">
          <thead>
            <tr>
              <th>Date</th>
              <th>Course</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let item of summary()!.history"
              [class]="'row-' + item.status"
            >
              <td class="date-col">{{ item.date | date:'d MMM yyyy' }}</td>
              <td class="course-col">{{ item.course_name }}</td>
              <td>
                <span [class]="'status-badge status-' + item.status.toLowerCase()">
                  {{ item.status }}
                </span>
              </td>
              <td class="remarks-col">{{ item.remarks ?? '—' }}</td>
            </tr>
          </tbody>
        </table>

        <ng-template #noHistory>
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <p>No attendance events recorded yet.</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .attendance-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .section-header h3 { margin: 0 0 0.25rem; }

    .sub {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    /* Loading */
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

    /* Error */
    .alert-error {
      padding: 0.85rem 1rem;
      background: rgba(248,113,113,0.1);
      border: 1px solid rgba(248,113,113,0.3);
      border-radius: 8px;
      color: #f87171;
      font-size: 0.9rem;
    }

    /* Stat cards */
    .stat-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.5rem;
      border-radius: 12px;
      transition: transform 0.2s;
    }

    .stat-card:hover { transform: translateY(-2px); }

    .stat-icon { font-size: 2rem; }

    .stat-body {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .stat-card.danger .stat-value  { color: #f87171; }
    .stat-card.warning .stat-value { color: #fbbf24; }
    .stat-card.info .stat-value    { color: #60a5fa; }

    .stat-card.danger  { border-left: 3px solid rgba(248,113,113,0.5); }
    .stat-card.warning { border-left: 3px solid rgba(251,191,36,0.5); }
    .stat-card.info    { border-left: 3px solid rgba(96,165,250,0.5); }

    /* Course breakdown */
    .breakdown-panel { padding: 1.5rem; }

    .breakdown-panel h4,
    .history-panel h4 {
      margin: 0 0 1.25rem;
      color: #818cf8;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 0.5rem;
    }

    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    .course-card {
      padding: 1rem;
      border-radius: 10px;
    }

    .course-name {
      font-weight: 600;
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .course-stats {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .cstat {
      font-size: 0.8rem;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-weight: 600;
    }

    .cstat.absent  { background: rgba(248,113,113,0.15); color: #f87171; }
    .cstat.late    { background: rgba(251,191,36,0.15);  color: #fbbf24; }
    .cstat.excused { background: rgba(96,165,250,0.15);  color: #60a5fa; }

    /* History table */
    .history-panel { padding: 1.5rem; }

    .date-col   { white-space: nowrap; }
    .course-col { font-weight: 500; }
    .remarks-col { color: var(--text-secondary); font-size: 0.875rem; }

    .status-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
    }

    .status-badge.status-present { background: rgba(52,211,153,0.2);  color: #34d399; }
    .status-badge.status-absent  { background: rgba(248,113,113,0.2); color: #f87171; }
    .status-badge.status-late    { background: rgba(251,191,36,0.2);  color: #fbbf24; }
    .status-badge.status-excused { background: rgba(96,165,250,0.2);  color: #60a5fa; }

    .row-ABSENT td { background: rgba(248,113,113,0.03); }
    .row-LATE   td { background: rgba(251,191,36,0.03); }

    /* Empty */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 2rem 0;
      color: var(--text-secondary);
    }

    .empty-icon { font-size: 2.5rem; opacity: 0.5; }

    /* Responsive */
    @media (max-width: 640px) {
      .stat-cards { grid-template-columns: 1fr; }
    }

    .fade-in { animation: fadeIn 0.3s ease-out; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class StudentAttendanceComponent implements OnInit {
  private attendanceService = inject(AttendanceService);

  summary = signal<StudentAttendanceSummaryResponse | null>(null);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    this.attendanceService.getMyAttendanceSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.detail ?? 'Failed to load your attendance summary.');
        this.loading.set(false);
      }
    });
  }
}
