export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE';
export type AccountStanding = 'GOOD_STANDING' | 'RESTRICTED';

export interface TuitionPayment {
  id: number;
  student_id: number;
  amount: number;
  balance_remaining: number;
  due_date: string;
  status: PaymentStatus;
  paid_at?: string | null;
  reconciled_by_id?: number | null;
  billing_period: string;
  notes?: string | null;
}

export interface StudentPaymentsStatus {
  standing: AccountStanding;
  total_balance: number;
  payments: TuitionPayment[];
}
