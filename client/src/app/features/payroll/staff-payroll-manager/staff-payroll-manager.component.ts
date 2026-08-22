import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../../core/services/payroll.service';
import { StaffSalaryEntry, StaffPayrollEntry } from '../../../core/models/payroll.model';

@Component({
  selector: 'app-staff-payroll-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-payroll-manager.component.html',
  styleUrls: ['./staff-payroll-manager.component.css']
})
export class StaffPayrollManagerComponent implements OnInit {
  private payrollService = inject(PayrollService);

  activeTab = signal<'config' | 'execute'>('config');
  currentMonth = signal<string>('');
  editingUserId = signal<number | null>(null);
  editSalaryAmount = 0;

  // Expose signals from service
  staffSalaries = this.payrollService.staffSalaries;
  payrollList = this.payrollService.payrollList;
  isLoading = this.payrollService.isLoading;
  error = this.payrollService.error;
  successMessage = signal<string | null>(null);

  constructor() {
    // Set default month to YYYY-MM format of today
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    this.currentMonth.set(`${yyyy}-${mm}`);
  }

  ngOnInit(): void {
    this.loadConfigData();
  }

  loadConfigData(): void {
    this.payrollService.loadStaffSalaries().subscribe();
  }

  loadPayrollData(): void {
    this.payrollService.loadPayrollList(this.currentMonth()).subscribe();
  }

  setTab(tab: 'config' | 'execute'): void {
    this.activeTab.set(tab);
    if (tab === 'config') {
      this.loadConfigData();
    } else {
      this.loadPayrollData();
    }
  }

  onMonthChange(event: any): void {
    const val = event.target.value;
    if (val) {
      this.currentMonth.set(val);
      this.loadPayrollData();
    }
  }

  startEdit(entry: StaffSalaryEntry): void {
    this.editingUserId.set(entry.user_id);
    this.editSalaryAmount = entry.base_salary || 0;
  }

  cancelEdit(): void {
    this.editingUserId.set(null);
  }

  saveSalary(userId: number): void {
    const amount = this.editSalaryAmount;
    if (amount <= 0 || isNaN(amount)) {
      this.showFeedback('Salary must be a positive number', true);
      return;
    }

    this.payrollService.setSalary(userId, { base_salary: amount }).subscribe({
      next: () => {
        this.editingUserId.set(null);
        this.showFeedback('Salary updated successfully', false);
      },
      error: (err) => {
        this.showFeedback(err.error?.detail || 'Failed to update salary', true);
      }
    });
  }

  markAsPaid(entry: StaffPayrollEntry): void {
    if (entry.status !== 'PENDING' || !entry.base_salary) return;

    this.payrollService.markAsPaid(entry.user_id, { payment_month: this.currentMonth() }).subscribe({
      next: () => {
        this.showFeedback(`Salary for ${entry.name} marked as PAID`, false);
      },
      error: (err) => {
        this.showFeedback(err.error?.detail || 'Failed to record payment', true);
      }
    });
  }

  private showFeedback(message: string, isError: boolean): void {
    if (isError) {
      this.payrollService.error.set(message);
      setTimeout(() => this.payrollService.error.set(null), 5000);
    } else {
      this.successMessage.set(message);
      setTimeout(() => this.successMessage.set(null), 5000);
    }
  }
}
