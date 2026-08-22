import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TuitionPayment, StudentPaymentsStatus } from '../models/payments.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api/v1/payments';

  constructor(private http: HttpClient) {}

  getStudentPaymentsStatus(): Observable<StudentPaymentsStatus> {
    return this.http.get<StudentPaymentsStatus>(`${this.baseUrl}/student/status`);
  }

  getStudentPaymentsAdmin(studentId: number): Observable<StudentPaymentsStatus> {
    return this.http.get<StudentPaymentsStatus>(`${this.baseUrl}/student/${studentId}`);
  }

  createInvoice(invoice: { student_id: number; amount: number; due_date: string; billing_period: string }): Observable<TuitionPayment> {
    return this.http.post<TuitionPayment>(`${this.baseUrl}/invoices`, invoice);
  }

  reconcilePayment(paymentId: number, notes: string | null): Observable<TuitionPayment> {
    return this.http.post<TuitionPayment>(`${this.baseUrl}/reconcile/${paymentId}`, { notes });
  }
}
