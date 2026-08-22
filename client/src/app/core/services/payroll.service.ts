import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, finalize, throwError } from 'rxjs';
import {
  StaffSalaryEntry,
  SetSalaryRequest,
  SetSalaryResponse,
  StaffPayrollEntry,
  MarkPaidRequest,
  SalaryPaymentResponse,
  FinancialSummary
} from '../models/payroll.model';

@Injectable({
  providedIn: 'root'
})
export class PayrollService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api/v1/payroll';

  staffSalaries = signal<StaffSalaryEntry[]>([]);
  payrollList = signal<StaffPayrollEntry[]>([]);
  financialSummary = signal<FinancialSummary | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  private handleError(err: any): Observable<never> {
    const msg = err.error?.detail || err.message || 'An unexpected error occurred';
    this.error.set(msg);
    return throwError(() => err);
  }

  loadStaffSalaries(): Observable<StaffSalaryEntry[]> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get<StaffSalaryEntry[]>(`${this.baseUrl}/staff/salaries`).pipe(
      tap(salaries => this.staffSalaries.set(salaries)),
      catchError(err => this.handleError(err)),
      finalize(() => this.isLoading.set(false))
    );
  }

  setSalary(userId: number, req: SetSalaryRequest): Observable<SetSalaryResponse> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.put<SetSalaryResponse>(`${this.baseUrl}/staff/${userId}/salary`, req).pipe(
      tap(res => {
        const updated = this.staffSalaries().map(s =>
          s.user_id === userId ? { ...s, base_salary: res.base_salary, updated_at: res.updated_at } : s
        );
        this.staffSalaries.set(updated);
      }),
      catchError(err => this.handleError(err)),
      finalize(() => this.isLoading.set(false))
    );
  }

  loadPayrollList(month: string): Observable<StaffPayrollEntry[]> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get<StaffPayrollEntry[]>(`${this.baseUrl}/list/${month}`).pipe(
      tap(list => this.payrollList.set(list)),
      catchError(err => this.handleError(err)),
      finalize(() => this.isLoading.set(false))
    );
  }

  markAsPaid(userId: number, req: MarkPaidRequest): Observable<SalaryPaymentResponse> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.post<SalaryPaymentResponse>(`${this.baseUrl}/staff/${userId}/pay`, req).pipe(
      tap(() => {
        this.loadPayrollList(req.payment_month).subscribe();
      }),
      catchError(err => this.handleError(err)),
      finalize(() => this.isLoading.set(false))
    );
  }

  loadFinancialSummary(month: string): Observable<FinancialSummary> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get<FinancialSummary>(`${this.baseUrl}/dashboard/${month}`).pipe(
      tap(summary => this.financialSummary.set(summary)),
      catchError(err => this.handleError(err)),
      finalize(() => this.isLoading.set(false))
    );
  }
}
