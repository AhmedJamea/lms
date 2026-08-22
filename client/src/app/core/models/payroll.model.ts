export type PayrollStatus = 'PAID' | 'PENDING' | 'NOT_CONFIGURED';

export interface StaffSalaryEntry {
  user_id: number;
  name: string;
  role: string;
  base_salary: number | null;
  updated_at: string | null;
}

export interface SetSalaryRequest {
  base_salary: number;
}

export interface SetSalaryResponse {
  user_id: number;
  name: string;
  base_salary: number;
  updated_at: string;
}

export interface StaffPayrollEntry {
  user_id: number;
  name: string;
  role: string;
  base_salary: number | null;
  status: PayrollStatus;
  payment_id: number | null;
  amount_paid: number | null;
  paid_on: string | null;
}

export interface MarkPaidRequest {
  payment_month: string;
}

export interface SalaryPaymentResponse {
  id: number;
  staff_id: number;
  payment_month: string;
  amount_paid: number;
  paid_on: string;
}

export interface FinancialSummary {
  month: string;
  fees_collected: number;
  fees_pending: number;
  salaries_paid: number;
  salaries_pending: number;
  net_balance: number;
}
