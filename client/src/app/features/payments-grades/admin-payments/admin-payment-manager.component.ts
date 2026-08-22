import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentsService } from '../../../core/services/payments.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { StudentPaymentsStatus, TuitionPayment } from '../../../core/models/payments.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-payment-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="payment-mgr fade-in">
      <div class="mgr-header">
        <div>
          <h3>Payment Reconciliation</h3>
          <p class="subtitle">Manually manage student tuition invoices and clear payment restrictions.</p>
        </div>
        <button
          class="btn btn-primary"
          (click)="openCreateModal()"
          [disabled]="!selectedStudent()"
          title="{{ !selectedStudent() ? 'Select a student first' : 'Create new invoice for selected student' }}"
        >
          + New Invoice
        </button>
      </div>

      <!-- Student Selector -->
      <div class="glass-panel selector-panel">
        <label class="selector-label" for="studentSelect">Select Student</label>
        <div class="selector-row">
          <select
            id="studentSelect"
            class="form-control student-select"
            (change)="onStudentSelect($event)"
          >
            <option value="">— Choose a student to view invoices —</option>
            <option *ngFor="let s of students()" [value]="s.id">
              {{ s.name }} ({{ s.email }})
            </option>
          </select>
          <span class="standing-chip" *ngIf="paymentStatus()" [ngClass]="standingClass()">
            {{ paymentStatus()?.standing === 'GOOD_STANDING' ? '✓ Good Standing' : '⚠ Restricted' }}
          </span>
        </div>
      </div>

      <!-- Invoice Grid -->
      <div class="glass-panel invoice-panel" *ngIf="selectedStudent()">
        <div class="invoice-panel-header">
          <h4>Invoices for {{ selectedStudent()?.name }}</h4>
          <div class="balance-tag" *ngIf="paymentStatus()">
            Outstanding: <strong [class.text-danger]="(paymentStatus()?.total_balance ?? 0) > 0">
              {{ paymentStatus()?.total_balance | currency:'USD':'symbol':'1.2-2' }}
            </strong>
          </div>
        </div>

        <div class="table-container" *ngIf="(paymentStatus()?.payments?.length ?? 0) > 0; else noInvoices">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Billing Period</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of paymentStatus()?.payments" [class.row-paid]="inv.status === 'PAID'">
                <td class="font-mono">#{{ inv.id }}</td>
                <td>{{ inv.billing_period }}</td>
                <td class="font-mono">{{ inv.amount | currency:'USD':'symbol':'1.2-2' }}</td>
                <td class="font-mono" [class.text-danger]="inv.balance_remaining > 0">
                  {{ inv.balance_remaining | currency:'USD':'symbol':'1.2-2' }}
                </td>
                <td>{{ inv.due_date | date:'MMM d, y' }}</td>
                <td>
                  <span class="status-pill" [ngClass]="getStatusClass(inv.status)">{{ inv.status }}</span>
                </td>
                <td>
                  <button
                    *ngIf="inv.status !== 'PAID'"
                    class="btn btn-success btn-sm"
                    (click)="reconcile(inv)"
                    [disabled]="reconcilingId() === inv.id"
                  >
                    {{ reconcilingId() === inv.id ? 'Saving...' : 'Mark Paid' }}
                  </button>
                  <span *ngIf="inv.status === 'PAID'" class="paid-label">✓ Reconciled</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ng-template #noInvoices>
          <div class="empty-state">
            <span class="empty-icon">🧾</span>
            <p>No invoices found for this student. Use "New Invoice" to create one.</p>
          </div>
        </ng-template>
      </div>

      <!-- Empty selection placeholder -->
      <div class="glass-panel empty-state large-empty" *ngIf="!selectedStudent()">
        <span class="empty-icon">👤</span>
        <p>Select a student above to view and manage their tuition invoices.</p>
      </div>
    </div>

    <!-- Create Invoice Modal -->
    <div class="modal-overlay" *ngIf="showCreateModal()">
      <div class="glass-panel modal-content">
        <h3>New Invoice for {{ selectedStudent()?.name }}</h3>
        <form [formGroup]="invoiceForm" (ngSubmit)="submitInvoice()">
          <div class="form-group">
            <label for="billingPeriod">Billing Period</label>
            <input id="billingPeriod" type="text" formControlName="billing_period" class="form-control"
              placeholder="e.g. Spring 2025" />
          </div>
          <div class="form-group">
            <label for="amount">Amount (USD)</label>
            <input id="amount" type="number" formControlName="amount" class="form-control" placeholder="e.g. 5000" />
          </div>
          <div class="form-group">
            <label for="dueDate">Due Date</label>
            <input id="dueDate" type="date" formControlName="due_date" class="form-control" />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary m-left" [disabled]="invoiceForm.invalid">Create Invoice</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .payment-mgr {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .mgr-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }
    .mgr-header h3 { margin: 0 0 0.25rem; }
    .subtitle { margin: 0; font-size: 0.875rem; color: #9ca3af; }
    .selector-panel {
      padding: 1.25rem 1.5rem;
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .selector-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9ca3af;
    }
    .selector-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .student-select {
      flex: 1;
      background: rgba(15, 23, 42, 0.6);
      padding: 0.6rem 0.75rem;
    }
    .standing-chip {
      padding: 0.35rem 0.875rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .standing-chip.good {
      background: rgba(16,185,129,0.1);
      color: #34d399;
      border: 1px solid rgba(16,185,129,0.25);
    }
    .standing-chip.restricted {
      background: rgba(239,68,68,0.1);
      color: #f87171;
      border: 1px solid rgba(239,68,68,0.25);
    }
    .invoice-panel {
      border-radius: 1rem;
      overflow: hidden;
    }
    .invoice-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.08));
    }
    .invoice-panel-header h4 { margin: 0; font-size: 0.9375rem; color: #f3f4f6; }
    .balance-tag {
      font-size: 0.875rem;
      color: #9ca3af;
    }
    .table-container { overflow-x: auto; }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .data-table th {
      padding: 0.875rem 1.25rem;
      color: #818cf8;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.08));
      white-space: nowrap;
    }
    .data-table td {
      padding: 1rem 1.25rem;
      font-size: 0.875rem;
      color: #d1d5db;
      border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.05));
      vertical-align: middle;
    }
    .row-paid td { opacity: 0.55; }
    .font-mono { font-family: monospace; }
    .text-danger { color: #f87171; }
    .status-pill {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .status-paid {
      background: rgba(16,185,129,0.1);
      color: #34d399;
      border: 1px solid rgba(16,185,129,0.2);
    }
    .status-pending {
      background: rgba(245,158,11,0.1);
      color: #fbbf24;
      border: 1px solid rgba(245,158,11,0.2);
    }
    .status-overdue {
      background: rgba(239,68,68,0.1);
      color: #f87171;
      border: 1px solid rgba(239,68,68,0.2);
    }
    .btn-success {
      background: rgba(16,185,129,0.2);
      color: #34d399;
      border: 1px solid rgba(16,185,129,0.3);
      padding: 0.4rem 0.875rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-success:hover:not(:disabled) {
      background: rgba(16,185,129,0.3);
    }
    .btn-success:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
    .paid-label {
      font-size: 0.8125rem;
      color: #34d399;
      font-weight: 600;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.5rem;
      gap: 0.75rem;
      color: #6b7280;
    }
    .empty-state .empty-icon { font-size: 2rem; }
    .empty-state p { margin: 0; font-size: 0.875rem; text-align: center; }
    .large-empty {
      border-radius: 1rem;
      min-height: 220px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 2rem;
    }
    .m-left { margin-left: 0.5rem; }
    .fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AdminPaymentManagerComponent implements OnInit {
  private paymentsService = inject(PaymentsService);
  private userService = inject(UserManagementService);
  private fb = inject(FormBuilder);

  students = signal<User[]>([]);
  selectedStudent = signal<User | null>(null);
  paymentStatus = signal<StudentPaymentsStatus | null>(null);
  reconcilingId = signal<number | null>(null);
  showCreateModal = signal(false);

  invoiceForm = this.fb.group({
    billing_period: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    due_date: ['', Validators.required]
  });

  ngOnInit(): void {
    this.userService.getUsers('STUDENT').subscribe({
      next: (users) => this.students.set(users),
      error: (err) => console.error('Error fetching students', err)
    });
  }

  onStudentSelect(event: Event): void {
    const id = parseInt((event.target as HTMLSelectElement).value, 10);
    if (!id) {
      this.selectedStudent.set(null);
      this.paymentStatus.set(null);
      return;
    }
    const student = this.students().find(s => s.id === id) ?? null;
    this.selectedStudent.set(student);
    this.loadStudentPayments(id);
  }

  loadStudentPayments(studentId: number): void {
    this.paymentsService.getStudentPaymentsAdmin(studentId).subscribe({
      next: (data) => this.paymentStatus.set(data),
      error: (err) => console.error('Error fetching student payments', err)
    });
  }

  reconcile(inv: TuitionPayment): void {
    if (!confirm(`Mark invoice #${inv.id} (${inv.billing_period}) as PAID?`)) return;
    this.reconcilingId.set(inv.id);
    this.paymentsService.reconcilePayment(inv.id, null).subscribe({
      next: () => {
        this.reconcilingId.set(null);
        if (this.selectedStudent()) {
          this.loadStudentPayments(this.selectedStudent()!.id);
        }
      },
      error: (err) => {
        this.reconcilingId.set(null);
        console.error('Error reconciling payment', err);
        alert(err.error?.detail ?? 'Failed to reconcile payment.');
      }
    });
  }

  openCreateModal(): void {
    this.invoiceForm.reset();
    this.showCreateModal.set(true);
  }

  closeModal(): void {
    this.showCreateModal.set(false);
  }

  submitInvoice(): void {
    if (this.invoiceForm.invalid || !this.selectedStudent()) return;
    const payload = {
      student_id: this.selectedStudent()!.id,
      amount: this.invoiceForm.value.amount!,
      due_date: this.invoiceForm.value.due_date!,
      billing_period: this.invoiceForm.value.billing_period!
    };
    this.paymentsService.createInvoice(payload).subscribe({
      next: () => {
        this.closeModal();
        this.loadStudentPayments(this.selectedStudent()!.id);
      },
      error: (err) => alert(err.error?.detail ?? 'Failed to create invoice.')
    });
  }

  standingClass(): string {
    return this.paymentStatus()?.standing === 'GOOD_STANDING' ? 'good' : 'restricted';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PAID': return 'status-paid';
      case 'OVERDUE': return 'status-overdue';
      default: return 'status-pending';
    }
  }
}
