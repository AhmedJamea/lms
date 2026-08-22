import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api/v1';

  constructor(private http: HttpClient) {}

  // --- Admin CRUD (Super-Admin only) ---
  getAdmins(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/admins`);
  }

  createAdmin(admin: { email: string; name: string; password?: string }): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/admins`, admin);
  }

  updateAdmin(id: number, data: { email?: string; name?: string; is_active?: boolean }): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/admins/${id}`, data);
  }

  deleteAdmin(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admins/${id}`);
  }

  // --- User CRUD (Admin / Super-Admin) ---
  getUsers(role?: UserRole, isActive?: boolean): Observable<User[]> {
    let params = new HttpParams();
    if (role) params = params.set('role', role);
    if (isActive !== undefined) params = params.set('is_active', String(isActive));

    return this.http.get<User[]>(`${this.baseUrl}/users`, { params });
  }

  createUser(user: { email: string; name: string; role: UserRole; password?: string }): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, user);
  }

  updateUser(id: number, data: { email?: string; name?: string; is_active?: boolean }): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/users/${id}`, data);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/users/${id}`);
  }
}
