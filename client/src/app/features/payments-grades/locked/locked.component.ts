import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PaymentsService } from '../../../core/services/payments.service';
import { PaymentLockService } from '../../../core/services/payment-lock.service';
import { AuthService } from '../../../core/auth/auth.service';
import { TuitionPayment } from '../../../core/models/payments.model';

@Component({
  selector: 'app-locked',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="locked-container">
      <div class="locked-card glass-panel fade-in">
        <div class="lock-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
            <path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clip-rule="evenodd" />
          </svg>
        </div>
        
        <h2>Access Restricted</h2>
        <p class="warning-text">
          Your learning portal access has been locked due to overdue tuition payments.
        </p>

        <div class="balance-summary" *ngIf="totalBalance() > 0">
          <span class="label">Total Outstanding Balance:</span>
          <span class="amount">\${{ totalBalance() | number:'1.2-2' }}</span>
        </div>

        <div class="invoice-section" *ngIf="overduePayments().length > 0">
          <h3>Overdue Invoices</h3>
          <div class="invoice-list">
            <div class="invoice-item" *ngFor="let p of overduePayments()">
              <div class="invoice-details">
                <span class="period">{{ p.billing_period }}</span>
                <span class="due-date">Due: {{ p.due_date | date:'mediumDate' }}</span>
              </div>
              <span class="invoice-amount">\${{ p.balance_remaining | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <p class="instruction">
          Please settle outstanding balances or contact the registrar/financial office to manually reconcile your account.
        </p>

        <div class="action-buttons">
          <button class="btn btn-primary" (click)="checkStatus()">Check Payment Status</button>
          <button class="btn btn-secondary" (click)="logout()">Log Out</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .locked-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      padding: 1.5rem;
    }
    .locked-card {
      max-width: 500px;
      width: 100%;
      padding: 2.5rem;
      border-radius: 1.5rem;
      text-align: center;
      border: 1px solid rgba(239, 68, 68, 0.2);
      box-shadow: 0 8px 32px 0 rgba(239, 68, 68, 0.05);
    }
    .lock-icon {
      color: #ef4444;
      margin-bottom: 1.5rem;
      display: inline-block;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.05); opacity: 1; }
      100% { transform: scale(1); opacity: 0.9; }
    }
    h2 {
      color: #f3f4f6;
      margin-top: 0;
      margin-bottom: 0.5rem;
      font-size: 1.75rem;
      letter-spacing: -0.025em;
    }
    .warning-text {
      color: #9ca3af;
      font-size: 1rem;
      line-height: 1.5;
      margin-bottom: 2rem;
    }
    .balance-summary {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      padding: 1rem;
      border-radius: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .balance-summary .label {
      color: #fca5a5;
      font-weight: 500;
    }
    .balance-summary .amount {
      color: #ef4444;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .invoice-section {
      text-align: left;
      margin-bottom: 2rem;
    }
    .invoice-section h3 {
      color: #e5e7eb;
      font-size: 1rem;
      margin-top: 0;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }
    .invoice-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 200px;
      overflow-y: auto;
    }
    .invoice-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.03);
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .invoice-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .invoice-details .period {
      color: #e5e7eb;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .invoice-details .due-date {
      color: #6b7280;
      font-size: 0.75rem;
    }
    .invoice-amount {
      color: #f3f4f6;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .instruction {
      color: #6b7280;
      font-size: 0.8125rem;
      line-height: 1.4;
      margin-bottom: 2rem;
    }
    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .btn {
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      border-radius: 0.5rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease-in-out;
    }
    .btn-primary {
      background: #ef4444;
      color: white;
    }
    .btn-primary:hover {
      background: #dc2626;
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: #d1d5db;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
      color: white;
    }
    .fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class LockedComponent implements OnInit {
  private paymentsService = inject(PaymentsService);
  private paymentLockService = inject(PaymentLockService);
  private authService = inject(AuthService);
  private router = inject(Router);

  totalBalance = signal<number>(0);
  overduePayments = signal<TuitionPayment[]>([]);

  ngOnInit(): void {
    this.loadLockData();
  }

  loadLockData(): void {
    this.paymentsService.getStudentPaymentsStatus().subscribe({
      next: (data) => {
        this.totalBalance.set(data.total_balance);
        const overdue = data.payments.filter((p) => p.status === 'OVERDUE');
        this.overduePayments.set(overdue);
        
        if (data.standing === 'GOOD_STANDING') {
          this.paymentLockService.clearLock();
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => console.error('Error fetching lock info', err)
    });
  }

  checkStatus(): void {
    this.loadLockData();
  }

  logout(): void {
    this.authService.logout();
    this.paymentLockService.clearLock();
    this.router.navigate(['/login']);
  }
}
