export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  must_change_password: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  role: UserRole;
  must_change_password: boolean;
}
