import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginResponse, User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly tokenKey = 'lms_auth_token';
  private readonly userKey = 'lms_auth_user';
  private readonly baseUrl = 'http://127.0.0.1:8000/api/v1';

  // Expose reactive state via Signals
  currentUser = signal<User | null>(this.getStoredUser());
  isAuthenticated = computed(() => this.currentUser() !== null);
  mustChangePassword = computed(() => this.currentUser()?.must_change_password ?? false);

  constructor(private http: HttpClient) {}

  login(credentials: { email: string; password: String }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap((res) => {
        localStorage.setItem(this.tokenKey, res.access_token);
        
        // Decoded payload contains 'sub' as email
        const tokenPayload = this.decodeToken(res.access_token);
        const email = tokenPayload?.sub ?? credentials.email;
        
        const user: User = {
          id: tokenPayload?.id ?? 0,
          email: email,
          name: email.split('@')[0], // Fallback name
          role: res.role,
          must_change_password: res.must_change_password,
          is_active: true
        };

        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.currentUser.set(user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
  }

  changePassword(passwords: { old_password: string; new_password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/change-password`, passwords).pipe(
      tap(() => {
        const user = this.currentUser();
        if (user) {
          user.must_change_password = false;
          localStorage.setItem(this.userKey, JSON.stringify(user));
          this.currentUser.set({ ...user });
        }
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private getStoredUser(): User | null {
    const stored = localStorage.getItem(this.userKey);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1]));
    } catch {
      return null;
    }
  }
}
