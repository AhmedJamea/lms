import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentsService } from '../../../core/services/payments.service';
import { StudentPaymentsStatus, TuitionPayment, AccountStanding } from '../../../core/models/payments.model';

@Component({
  selector: 'app-student-payments',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="payments-section fade-in">
      <div class="section-header">
        <h3>Tuition & Payments</h3>
        <div class="standing-badge" [ngClass]="standingClass()" *ngIf="status()">
          <span class="standing-dot"></span>
          <span>{{ status()?.standing === 'GOOD_STANDING' ? 'Good Standing' : 'Account Restricted' }}</span>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid" *ngIf="status()">
        <div class="summary-card glass-panel">
          <span class="summary-label">Total Balance Due</span>
          <span class="summary-value" [class.text-danger]="(status()?.total_balance ?? 0) > 0">
            {{ status()?.total_balance | currency:'USD':'symbol':'1.2-2' }}
          </span>
        </div>
        <div class="summary-card glass-panel">
          <span class="summary-label">Total Invoices</span>
          <span class="summary-value">{{ status()?.payments?.length ?? 0 }}</span>
        </div>
        <div class="summary-card glass-panel">
          <span class="summary-label">Outstanding</span>
          <span class="summary-value text-warning">
            {{ outstandingCount() }}
          </span>
        </div>
      </div>

      <!-- Restricted Banner -->
      <div class="restricted-banner glass-panel" *ngIf="status()?.standing === 'RESTRICTED'">
        <span class="banner-icon">⚠️</span>
        <div>
          <strong>Account Restricted</strong>
          <p>Your account has overdue tuition payments. Some platform features are disabled until your balance is cleared. Please contact the finance office.</p>
        </div>
      </div>

      <!-- Invoice Table -->
      <div class="card glass-panel">
        <div class="card-header">
          <h4>Invoice History</h4>
        </div>
        <div class="table-container">
          <table class="data-table" *ngIf="(status()?.payments?.length ?? 0) > 0; else emptyState">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Billing Period</th>
                <th>Amount</th>
                <th>Balance Remaining</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Paid On</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of status()?.payments">
                <td class="font-mono">#{{ inv.id }}</td>
                <td>{{ inv.billing_period }}</td>
                <td class="font-mono">{{ inv.amount | currency:'USD':'symbol':'1.2-2' }}</td>
                <td class="font-mono" [class.text-danger]="inv.balance_remaining > 0">
                  {{ inv.balance_remaining | currency:'USD':'symbol':'1.2-2' }}
                </td>
                <td>{{ inv.due_date | date:'MMM d, y' }}</td>
                <td>
                  <span class="status-pill" [ngClass]="getStatusClass(inv.status)">
                    {{ inv.status }}
                  </span>
                </td>
                <td class="secondary-text">
                  {{ inv.paid_at ? (inv.paid_at | date:'MMM d, y') : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #emptyState>
            <div class="empty-state">
              <span class="empty-icon">📄</span>
              <p>No tuition invoices on record. Contact the finance office if you believe this is an error.</p>
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payments-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .standing-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      border-radius: 2rem;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .standing-badge.good {
      background: rgba(16, 185, 129, 0.1);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .standing-badge.restricted {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }
    .standing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .summary-card {
      padding: 1.25rem 1.5rem;
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .summary-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9ca3af;
    }
    .summary-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #f3f4f6;
    }
    .restricted-banner {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border-radius: 0.75rem;
      border: 1px solid rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.07);
      color: #fca5a5;
    }
    .restricted-banner .banner-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    .restricted-banner strong {
      display: block;
      margin-bottom: 0.25rem;
      color: #f87171;
    }
    .restricted-banner p {
      font-size: 0.875rem;
      color: #fca5a5;
      margin: 0;
    }
    .card {
      border-radius: 1rem;
      overflow: hidden;
    }
    .card-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.08));
    }
    .card-header h4 {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #f3f4f6;
    }
    .table-container {
      overflow-x: auto;
    }
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
    }
    .font-mono { font-family: monospace; }
    .text-danger { color: #f87171; }
    .text-warning { color: #fbbf24; }
    .secondary-text { color: #6b7280; }
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
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      gap: 0.75rem;
      color: #6b7280;
    }
    .empty-state .empty-icon { font-size: 2rem; }
    .empty-state p { margin: 0; font-size: 0.875rem; text-align: center; }
    .fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class StudentPaymentsComponent implements OnInit {
  private paymentsService = inject(PaymentsService);
  status = signal<StudentPaymentsStatus | null>(null);

  ngOnInit(): void {
    this.paymentsService.getStudentPaymentsStatus().subscribe({
      next: (data) => this.status.set(data),
      error: (err) => console.error('Error fetching payment status', err)
    });
  }

  standingClass(): string {
    return this.status()?.standing === 'GOOD_STANDING' ? 'good' : 'restricted';
  }

  outstandingCount(): number {
    return this.status()?.payments?.filter(p => p.status !== 'PAID').length ?? 0;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PAID': return 'status-paid';
      case 'OVERDUE': return 'status-overdue';
      default: return 'status-pending';
    }
  }
}
