import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../../core/services/attendance.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { AuthService } from '../../../core/auth/auth.service';
import { StaffAbsenceResponse, StaffAbsenceCreate } from '../../../core/models/attendance.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-staff-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="staff-section fade-in">
      <!-- Header -->
      <div class="section-header">
        <div>
          <h3>Staff Absence Log</h3>
          <p class="sub">Record and manage daily absences for teachers and admins.</p>
        </div>
        <button id="log-absence-btn" class="btn btn-primary" (click)="openModal()">
          + Log Absence
        </button>
      </div>

      <!-- Filter bar -->
      <div class="controls-bar glass-panel">
        <div class="control-group">
          <label for="filterDate">Filter by Date</label>
          <input
            id="filterDate"
            type="date"
            class="form-control"
            [(ngModel)]="filterDate"
            (change)="loadAbsences()"
          />
        </div>
        <div class="control-group">
          <label for="filterUser">Filter by Staff Member</label>
          <select id="filterUser" class="form-control" [(ngModel)]="filterUserId" (change)="loadAbsences()">
            <option value="">All Staff</option>
            <option *ngFor="let u of eligibleStaff()" [value]="u.id">{{ u.name }} ({{ u.role }})</option>
          </select>
        </div>
        <div class="control-group">
          <label>&nbsp;</label>
          <button class="btn btn-secondary" (click)="clearFilters()">Clear Filters</button>
        </div>
      </div>

      <!-- Alerts -->
      <div *ngIf="errorMsg()" class="alert-error">⚠ {{ errorMsg() }}</div>
      <div *ngIf="successMsg()" class="alert-success">✓ {{ successMsg() }}</div>

      <!-- Loading -->
      <div *ngIf="loading()" class="state-msg">
        <div class="spinner"></div><span>Loading records…</span>
      </div>

      <!-- Table -->
      <div *ngIf="!loading()" class="glass-panel table-panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Staff Member</th>
              <th>Role</th>
              <th>Date</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Logged By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let abs of absences()">
              <td class="dim">{{ abs.absence_id }}</td>
              <td class="staff-name">{{ abs.name }}</td>
              <td><span class="role-chip">{{ abs.role }}</span></td>
              <td>{{ abs.date | date:'d MMM yyyy' }}</td>
              <td class="reason-col">{{ abs.reason ?? '—' }}</td>
              <td>
                <span [class]="abs.is_excused ? 'badge excused' : 'badge unexcused'">
                  {{ abs.is_excused ? 'Excused' : 'Unexcused' }}
                </span>
              </td>
              <td class="dim">{{ abs.recorded_by_name ?? '—' }}</td>
              <td>
                <button
                  class="btn btn-danger btn-sm"
                  [id]="'delete-absence-' + abs.absence_id"
                  [disabled]="canDelete(abs)"
                  (click)="deleteAbsence(abs.absence_id)"
                >Delete</button>
              </td>
            </tr>
            <tr *ngIf="absences().length === 0">
              <td colspan="8" class="empty-row">No absence records found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Log Absence Modal -->
    <div *ngIf="showModal()" class="modal-overlay">
      <div class="glass-panel modal-content">
        <h3>Log Staff Absence</h3>

        <div class="form-group">
          <label for="modalUser">Staff Member *</label>
          <select id="modalUser" class="form-control" [(ngModel)]="form.user_id">
            <option [value]="0">— Select staff member —</option>
            <option *ngFor="let u of eligibleStaff()" [value]="u.id">
              {{ u.name }} — {{ u.role }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="modalDate">Absence Date *</label>
          <input
            id="modalDate"
            type="date"
            class="form-control"
            [(ngModel)]="form.date"
            [max]="today"
          />
        </div>

        <div class="form-group">
          <label for="modalReason">Reason (Optional)</label>
          <textarea
            id="modalReason"
            class="form-control"
            rows="3"
            [(ngModel)]="form.reason"
            placeholder="e.g. Sick leave, family emergency…"
          ></textarea>
        </div>

        <div class="form-group toggle-row">
          <span>Mark as Excused</span>
          <label class="toggle">
            <input type="checkbox" [(ngModel)]="form.is_excused" id="modalExcused" />
            <span class="slider"></span>
          </label>
        </div>

        <div *ngIf="modalError()" class="alert-error modal-alert">⚠ {{ modalError() }}</div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
          <button
            id="submit-absence-btn"
            class="btn btn-primary m-left"
            [disabled]="submitting()"
            (click)="submitAbsence()"
          >
            <span *ngIf="!submitting()">Log Absence</span>
            <span *ngIf="submitting()">Saving…</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .staff-section {
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
      min-width: 180px;
    }

    .control-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* Alerts */
    .alert-error {
      padding: 0.85rem 1rem;
      background: rgba(248,113,113,0.1);
      border: 1px solid rgba(248,113,113,0.3);
      border-radius: 8px;
      color: #f87171;
      font-size: 0.9rem;
    }

    .alert-success {
      padding: 0.85rem 1rem;
      background: rgba(52,211,153,0.1);
      border: 1px solid rgba(52,211,153,0.3);
      border-radius: 8px;
      color: #34d399;
      font-size: 0.9rem;
    }

    .modal-alert { margin-bottom: 0; margin-top: 0.75rem; }

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

    /* Table */
    .table-panel { padding: 1.5rem; }

    .dim { color: var(--text-secondary); font-size: 0.85rem; }

    .staff-name { font-weight: 500; }

    .role-chip {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      background: rgba(99,102,241,0.15);
      color: #818cf8;
      border-radius: 4px;
    }

    .reason-col { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
    }

    .badge.excused   { background: rgba(96,165,250,0.2); color: #60a5fa; }
    .badge.unexcused { background: rgba(248,113,113,0.2); color: #f87171; }

    .empty-row {
      text-align: center;
      color: var(--text-secondary);
      padding: 2rem 0;
    }

    .btn-sm { padding: 0.35rem 0.7rem; font-size: 0.8rem; }
    .m-left { margin-left: 0.5rem; }

    /* Modal */
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 2rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-bottom: 1rem;
    }

    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    textarea.form-control { resize: vertical; }

    .toggle-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-top: 1px solid var(--panel-border);
      border-bottom: 1px solid var(--panel-border);
    }

    /* Toggle switch */
    .toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute; inset: 0;
      background: rgba(255,255,255,0.1);
      border-radius: 9999px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .slider::before {
      content: '';
      position: absolute;
      width: 18px; height: 18px;
      left: 3px; top: 3px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .toggle input:checked + .slider { background: #6366f1; }
    .toggle input:checked + .slider::before { transform: translateX(20px); }

    .fade-in { animation: fadeIn 0.3s ease-out; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AdminStaffTrackingComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private userService = inject(UserManagementService);
  private authService = inject(AuthService);

  readonly today = new Date().toISOString().split('T')[0];

  // Filters
  filterDate = '';
  filterUserId: number | '' = '';

  // Signals
  absences = signal<StaffAbsenceResponse[]>([]);
  allStaff = signal<User[]>([]);
  loading = signal(false);
  showModal = signal(false);
  submitting = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  modalError = signal<string | null>(null);

  // Computed: staff eligible to be logged depends on role
  eligibleStaff = computed<User[]>(() => {
    const me = this.authService.currentUser();
    if (!me) return [];
    if (me.role === 'SUPER_ADMIN') {
      // Super-admin can log teachers + standard admins
      return this.allStaff().filter(
        (u) => u.id !== me.id && (u.role === 'TEACHER' || u.role === 'ADMIN')
      );
    }
    // Standard admin: only teachers
    return this.allStaff().filter((u) => u.role === 'TEACHER');
  });

  // Form state
  form: StaffAbsenceCreate = {
    user_id: 0,
    date: this.today,
    reason: null,
    is_excused: false,
  };

  ngOnInit(): void {
    this.loadAbsences();
    this.loadStaff();
  }

  loadAbsences(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    const userId = this.filterUserId ? Number(this.filterUserId) : undefined;
    const date = this.filterDate || undefined;

    this.attendanceService.getStaffAbsences(date, userId).subscribe({
      next: (data) => {
        this.absences.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.detail ?? 'Failed to load absences.');
        this.loading.set(false);
      }
    });
  }

  private loadStaff(): void {
    this.userService.getUsers().subscribe({
      next: (users) => this.allStaff.set(users),
      error: () => {}
    });
  }

  clearFilters(): void {
    this.filterDate = '';
    this.filterUserId = '';
    this.loadAbsences();
  }

  openModal(): void {
    this.form = { user_id: 0, date: this.today, reason: null, is_excused: false };
    this.modalError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitAbsence(): void {
    if (!this.form.user_id) {
      this.modalError.set('Please select a staff member.');
      return;
    }
    if (!this.form.date) {
      this.modalError.set('Please select an absence date.');
      return;
    }

    this.submitting.set(true);
    this.modalError.set(null);

    this.attendanceService.createStaffAbsence(this.form).subscribe({
      next: () => {
        this.closeModal();
        this.successMsg.set('Staff absence logged successfully.');
        this.submitting.set(false);
        this.loadAbsences();
      },
      error: (err) => {
        this.modalError.set(err.error?.detail ?? 'Failed to log absence.');
        this.submitting.set(false);
      }
    });
  }

  /** Returns true when the current admin CANNOT delete this absence (to disable the button) */
  canDelete(abs: StaffAbsenceResponse): boolean {
    const me = this.authService.currentUser();
    if (!me) return true;
    // Cannot delete own record
    if (abs.user_id === me.id) return true;
    // Standard admin cannot delete admin/super-admin records
    if (me.role === 'ADMIN' && (abs.role === 'ADMIN' || abs.role === 'SUPER_ADMIN')) return true;
    return false;
  }

  deleteAbsence(absenceId: number): void {
    if (!confirm('Delete this absence record?')) return;
    this.attendanceService.deleteStaffAbsence(absenceId).subscribe({
      next: () => {
        this.successMsg.set('Record deleted.');
        this.loadAbsences();
      },
      error: (err) => this.errorMsg.set(err.error?.detail ?? 'Failed to delete record.')
    });
  }
}
