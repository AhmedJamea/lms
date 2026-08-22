import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith, switchMap } from 'rxjs';
import { PayrollService } from '../../../core/services/payroll.service';

@Component({
  selector: 'app-financial-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './financial-dashboard.component.html',
  styleUrls: ['./financial-dashboard.component.css']
})
export class FinancialDashboardComponent implements OnInit {
  private payrollService = inject(PayrollService);
  private destroyRef = inject(DestroyRef);

  monthControl = new FormControl('');

  // Expose signals from service
  financialSummary = this.payrollService.financialSummary;
  isLoading = this.payrollService.isLoading;
  error = this.payrollService.error;

  constructor() {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    this.monthControl.setValue(`${yyyy}-${mm}`);
  }

  ngOnInit(): void {
    this.monthControl.valueChanges.pipe(
      startWith(this.monthControl.value),
      switchMap(month => this.payrollService.loadFinancialSummary(month || '')),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }
}
