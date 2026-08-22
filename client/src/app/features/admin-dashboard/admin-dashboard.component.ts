import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { User, UserRole } from '../../core/models/user.model';
import { GradeManagementComponent } from '../academic/grades/grade-management.component';
import { CourseManagementComponent } from '../academic/courses/course-management.component';
import { ExamSchedulingComponent } from '../academic/exams/exam-scheduling.component';
import { StudentTimetableComponent } from '../academic/student-timetable/student-timetable.component';
import { StudentTranscriptComponent } from '../payments-grades/transcript/student-transcript.component';
import { StudentPaymentsComponent } from '../payments-grades/payments/student-payments.component';
import { AdminPaymentManagerComponent } from '../payments-grades/admin-payments/admin-payment-manager.component';
import { TeacherAttendanceComponent } from '../attendance/teacher-attendance/teacher-attendance.component';
import { AdminStaffTrackingComponent } from '../attendance/admin-staff-tracking/admin-staff-tracking.component';
import { StudentAttendanceComponent } from '../attendance/student-attendance/student-attendance.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GradeManagementComponent,
    CourseManagementComponent,
    ExamSchedulingComponent,
    StudentTimetableComponent,
    StudentTranscriptComponent,
    StudentPaymentsComponent,
    AdminPaymentManagerComponent,
    TeacherAttendanceComponent,
    AdminStaffTrackingComponent,
    StudentAttendanceComponent
  ],
  template: `
    <div class="dashboard-layout">
      <!-- Sidebar Navigation -->
      <aside class="sidebar glass-panel">
        <div class="brand">
          <h3>LMS PORTAL</h3>
        </div>

        <nav class="nav-menu">
          <button
            class="nav-link"
            [class.active]="activeTab() === 'overview'"
            (click)="setTab('overview')"
          >
            Dashboard Overview
          </button>

          <button
            *ngIf="isSuperAdmin()"
            class="nav-link"
            [class.active]="activeTab() === 'admins'"
            (click)="setTab('admins')"
          >
            Admin Management
          </button>

          <button
            *ngIf="isAdminOrSuper()"
            class="nav-link"
            [class.active]="activeTab() === 'users'"
            (click)="setTab('users')"
          >
            User Provisioning
          </button>

          <button
            *ngIf="isAdminOrSuper()"
            class="nav-link"
            [class.active]="activeTab() === 'grades'"
            (click)="setTab('grades')"
          >
            Grade Configuration
          </button>

          <button
            *ngIf="isAdminOrSuper()"
            class="nav-link"
            [class.active]="activeTab() === 'courses'"
            (click)="setTab('courses')"
          >
            Course Assignment
          </button>

          <button
            *ngIf="isAdminOrSuper()"
            class="nav-link"
            [class.active]="activeTab() === 'exams'"
            (click)="setTab('exams')"
          >
            Exam Scheduling
          </button>

          <button
            *ngIf="isStudent()"
            class="nav-link"
            [class.active]="activeTab() === 'student-timetable'"
            (click)="setTab('student-timetable')"
          >
            My Timetable & Exams
          </button>

          <button
            *ngIf="isStudent()"
            class="nav-link"
            [class.active]="activeTab() === 'my-transcript'"
            (click)="setTab('my-transcript')"
          >
            My Transcript
          </button>

          <button
            *ngIf="isStudent()"
            class="nav-link"
            [class.active]="activeTab() === 'my-payments'"
            (click)="setTab('my-payments')"
          >
            My Payments
          </button>

          <button
            *ngIf="isAdminOrSuper()"
            class="nav-link"
            [class.active]="activeTab() === 'payment-manager'"
            (click)="setTab('payment-manager')"
          >
            Payment Reconciliation
          </button>

          <!-- Attendance nav items -->
          <button
            *ngIf="isTeacher()"
            class="nav-link"
            [class.active]="activeTab() === 'attendance-roster'"
            (click)="setTab('attendance-roster')"
          >
            Class Attendance
          </button>

          <button
            *ngIf="isAdminOrSuper()"
            class="nav-link"
            [class.active]="activeTab() === 'staff-absences'"
            (click)="setTab('staff-absences')"
          >
            Staff Absences
          </button>

          <button
            *ngIf="isStudent()"
            class="nav-link"
            [class.active]="activeTab() === 'my-attendance'"
            (click)="setTab('my-attendance')"
          >
            My Attendance
          </button>
        </nav>

        <div class="sidebar-footer">
          <button class="btn btn-secondary w-full" (click)="onLogout()">
            Sign Out
          </button>
        </div>
      </aside>

      <!-- Main Dashboard Content -->
      <main class="main-content">
        <!-- Top Bar -->
        <header class="topbar glass-panel">
          <div class="welcome">
            <h2>Welcome, {{ currentUser()?.name }}</h2>
            <span class="role-badge">{{ currentUser()?.role }}</span>
          </div>
        </header>

        <!-- Dynamic Panels -->
        <div class="panel-container">
          <!-- 1. OVERVIEW PANEL -->
          <div *ngIf="activeTab() === 'overview'" class="glass-panel panel-card fade-in">
            <h3>Account Profile</h3>
            <div class="profile-details">
              <div class="detail-row">
                <span class="label">Name:</span>
                <span class="value">{{ currentUser()?.name }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Email:</span>
                <span class="value">{{ currentUser()?.email }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Role:</span>
                <span class="value text-accent">{{ currentUser()?.role }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Account Status:</span>
                <span class="value text-success">Active</span>
              </div>
            </div>
          </div>

          <!-- 2. ADMINS PANEL -->
          <div *ngIf="activeTab() === 'admins' && isSuperAdmin()" class="glass-panel panel-card fade-in">
            <div class="panel-header">
              <h3>Standard Admin Accounts</h3>
              <button class="btn btn-primary" (click)="openAddAdminModal()">Add New Admin</button>
            </div>

            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let admin of admins()">
                  <td>{{ admin.id }}</td>
                  <td>{{ admin.name }}</td>
                  <td>{{ admin.email }}</td>
                  <td>
                    <span [class]="admin.is_active ? 'text-success' : 'text-danger'">
                      {{ admin.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm" (click)="toggleAdminStatus(admin)">
                      {{ admin.is_active ? 'Deactivate' : 'Activate' }}
                    </button>
                    <button class="btn btn-danger btn-sm m-left" (click)="deleteAdmin(admin.id)">
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 3. USERS PANEL -->
          <div *ngIf="activeTab() === 'users' && isAdminOrSuper()" class="glass-panel panel-card fade-in">
            <div class="panel-header">
              <h3>Student & Teacher Profiles</h3>
              <div class="panel-actions">
                <select class="form-control filter-select" (change)="onFilterRoleChange($event)">
                  <option value="">All Roles</option>
                  <option value="STUDENT">Students</option>
                  <option value="TEACHER">Teachers</option>
                </select>
                <button class="btn btn-primary m-left" (click)="openAddUserModal()">Add User Profile</button>
              </div>
            </div>

            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of users()">
                  <td>{{ user.id }}</td>
                  <td>{{ user.name }}</td>
                  <td>{{ user.email }}</td>
                  <td><span class="role-sub-badge">{{ user.role }}</span></td>
                  <td>
                    <span [class]="user.is_active ? 'text-success' : 'text-danger'">
                      {{ user.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm" (click)="toggleUserStatus(user)">
                      {{ user.is_active ? 'Deactivate' : 'Activate' }}
                    </button>
                    <button class="btn btn-danger btn-sm m-left" (click)="deleteUser(user.id)">
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 4. GRADES PANEL -->
          <div *ngIf="activeTab() === 'grades' && isAdminOrSuper()" class="glass-panel panel-card fade-in">
            <app-grade-management></app-grade-management>
          </div>

          <!-- 5. COURSES PANEL -->
          <div *ngIf="activeTab() === 'courses' && isAdminOrSuper()" class="glass-panel panel-card fade-in">
            <app-course-management></app-course-management>
          </div>

          <!-- 6. EXAMS PANEL -->
          <div *ngIf="activeTab() === 'exams' && isAdminOrSuper()" class="glass-panel panel-card fade-in">
            <app-exam-scheduling></app-exam-scheduling>
          </div>

          <!-- 7. STUDENT TIMETABLE PANEL -->
          <div *ngIf="activeTab() === 'student-timetable' && isStudent()" class="glass-panel panel-card fade-in">
            <app-student-timetable></app-student-timetable>
          </div>

          <!-- 8. STUDENT TRANSCRIPT PANEL -->
          <div *ngIf="activeTab() === 'my-transcript' && isStudent()" class="glass-panel panel-card fade-in">
            <app-student-transcript></app-student-transcript>
          </div>

          <!-- 9. STUDENT PAYMENTS PANEL -->
          <div *ngIf="activeTab() === 'my-payments' && isStudent()" class="glass-panel panel-card fade-in">
            <app-student-payments></app-student-payments>
          </div>

          <!-- 10. ADMIN PAYMENT MANAGER PANEL -->
          <div *ngIf="activeTab() === 'payment-manager' && isAdminOrSuper()" class="glass-panel panel-card fade-in">
            <app-admin-payment-manager></app-admin-payment-manager>
          </div>

          <!-- 11. TEACHER ATTENDANCE PANEL -->
          <div *ngIf="activeTab() === 'attendance-roster' && isTeacher()" class="glass-panel panel-card fade-in">
            <app-teacher-attendance></app-teacher-attendance>
          </div>

          <!-- 12. ADMIN STAFF ABSENCES PANEL -->
          <div *ngIf="activeTab() === 'staff-absences' && isAdminOrSuper()" class="glass-panel panel-card fade-in">
            <app-admin-staff-tracking></app-admin-staff-tracking>
          </div>

          <!-- 13. STUDENT ATTENDANCE PANEL -->
          <div *ngIf="activeTab() === 'my-attendance' && isStudent()" class="glass-panel panel-card fade-in">
            <app-student-attendance></app-student-attendance>
          </div>
        </div>
      </main>
    </div>

    <!-- MODAL overlays -->
    <!-- Add Admin Modal -->
    <div *ngIf="showAdminModal()" class="modal-overlay">
      <div class="glass-panel modal-content">
        <h3>Create Admin Account</h3>
        <form [formGroup]="adminForm" (ngSubmit)="submitAdminForm()">
          <div class="form-group">
            <label for="adminName">Full Name</label>
            <input id="adminName" type="text" formControlName="name" class="form-control" placeholder="e.g. John Admin" />
          </div>
          <div class="form-group">
            <label for="adminEmail">Email Address</label>
            <input id="adminEmail" type="email" formControlName="email" class="form-control" placeholder="e.g. admin@school.com" />
          </div>
          <div class="form-group">
            <label for="adminPassword">Password (Temporary)</label>
            <input id="adminPassword" type="text" formControlName="password" class="form-control" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary m-left">Create Admin</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add User Modal -->
    <div *ngIf="showUserModal()" class="modal-overlay">
      <div class="glass-panel modal-content">
        <h3>Create User Profile</h3>
        <form [formGroup]="userForm" (ngSubmit)="submitUserForm()">
          <div class="form-group">
            <label for="userName">Full Name</label>
            <input id="userName" type="text" formControlName="name" class="form-control" placeholder="e.g. Alice Student" />
          </div>
          <div class="form-group">
            <label for="userEmail">Email Address</label>
            <input id="userEmail" type="email" formControlName="email" class="form-control" placeholder="e.g. alice@school.com" />
          </div>
          <div class="form-group">
            <label for="userRole">Role</label>
            <select id="userRole" formControlName="role" class="form-control">
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
            </select>
          </div>
          <div class="form-group">
            <label for="userPassword">Password (Temporary)</label>
            <input id="userPassword" type="text" formControlName="password" class="form-control" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary m-left">Create Profile</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: 100vh;
      gap: 1.5rem;
      padding: 1.5rem;
    }
    .sidebar {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 3rem);
      position: sticky;
      top: 1.5rem;
    }
    .brand {
      margin-bottom: 2.5rem;
      text-align: center;
      letter-spacing: 0.1em;
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 1rem;
    }
    .nav-menu {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex-grow: 1;
    }
    .nav-link {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 0.95rem;
      font-weight: 500;
      text-align: left;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: var(--transition);
      outline: none;
    }
    .nav-link:hover, .nav-link.active {
      color: var(--text-primary);
      background: rgba(99, 102, 241, 0.15);
      padding-left: 1.25rem;
    }
    .main-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 2rem;
    }
    .welcome {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .role-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .role-sub-badge {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.2rem 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    .panel-container {
      flex-grow: 1;
    }
    .panel-card {
      height: 100%;
      min-height: 500px;
    }
    .profile-details {
      margin-top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-width: 500px;
    }
    .detail-row {
      display: grid;
      grid-template-columns: 150px 1fr;
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 0.75rem;
    }
    .detail-row .label {
      color: var(--text-secondary);
      font-weight: 500;
    }
    .text-accent {
      color: #818cf8;
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .panel-actions {
      display: flex;
      align-items: center;
    }
    .filter-select {
      width: 180px;
      background: rgba(15, 23, 42, 0.6);
      padding: 0.5rem 0.75rem;
    }
    .btn-sm {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }
    .m-left {
      margin-left: 0.5rem;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 2rem;
    }
    .fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserManagementService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;
  isSuperAdmin = computed(() => this.currentUser()?.role === 'SUPER_ADMIN');
  isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
  isAdminOrSuper = computed(() => this.isSuperAdmin() || this.isAdmin());
  isStudent = computed(() => this.currentUser()?.role === 'STUDENT');
  isTeacher = computed(() => this.currentUser()?.role === 'TEACHER');

  activeTab = signal<'overview' | 'admins' | 'users' | 'grades' | 'courses' | 'exams' | 'student-timetable' | 'my-transcript' | 'my-payments' | 'payment-manager' | 'attendance-roster' | 'staff-absences' | 'my-attendance'>('overview');
  admins = signal<User[]>([]);
  users = signal<User[]>([]);

  // Modals Visibility
  showAdminModal = signal(false);
  showUserModal = signal(false);

  // Forms
  adminForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['TempPass123!', [Validators.required, Validators.minLength(8)]]
  });

  userForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['STUDENT' as UserRole, Validators.required],
    password: ['TempUser123!', [Validators.required, Validators.minLength(8)]]
  });

  currentFilterRole: UserRole | undefined;

  ngOnInit(): void {
    if (this.isStudent()) {
      this.activeTab.set('student-timetable');
    } else if (this.isTeacher()) {
      this.activeTab.set('attendance-roster');
    }
    this.loadData();
  }

  setTab(tab: 'overview' | 'admins' | 'users' | 'grades' | 'courses' | 'exams' | 'student-timetable' | 'my-transcript' | 'my-payments' | 'payment-manager' | 'attendance-roster' | 'staff-absences' | 'my-attendance'): void {
    this.activeTab.set(tab);
    this.loadData();
  }

  loadData(): void {
    if (this.activeTab() === 'admins' && this.isSuperAdmin()) {
      this.userService.getAdmins().subscribe({
        next: (data) => this.admins.set(data),
        error: (err) => console.error('Error fetching admins', err)
      });
    } else if (this.activeTab() === 'users' && this.isAdminOrSuper()) {
      this.userService.getUsers(this.currentFilterRole).subscribe({
        next: (data) => this.users.set(data),
        error: (err) => console.error('Error fetching users', err)
      });
    }
  }

  onFilterRoleChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.currentFilterRole = value ? (value as UserRole) : undefined;
    this.loadData();
  }

  // Admin Methods
  openAddAdminModal(): void {
    this.adminForm.reset({
      name: '',
      email: '',
      password: 'TempAdminPass123!'
    });
    this.showAdminModal.set(true);
  }

  submitAdminForm(): void {
    if (this.adminForm.invalid) return;
    const adminData = {
      name: this.adminForm.value.name!,
      email: this.adminForm.value.email!,
      password: this.adminForm.value.password!
    };
    this.userService.createAdmin(adminData).subscribe({
      next: () => {
        this.showAdminModal.set(false);
        this.loadData();
      },
      error: (err) => alert(err.error?.detail ?? 'Failed to create Admin')
    });
  }

  toggleAdminStatus(admin: User): void {
    const newStatus = !admin.is_active;
    this.userService.updateAdmin(admin.id, { is_active: newStatus }).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Error updating status', err)
    });
  }

  deleteAdmin(id: number): void {
    if (!confirm('Are you sure you want to delete this Admin account?')) return;
    this.userService.deleteAdmin(id).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Error deleting admin', err)
    });
  }

  // User Methods
  openAddUserModal(): void {
    this.userForm.reset({
      name: '',
      email: '',
      role: 'STUDENT',
      password: 'TempUserPass123!'
    });
    this.showUserModal.set(true);
  }

  submitUserForm(): void {
    if (this.userForm.invalid) return;
    const userData = {
      name: this.userForm.value.name!,
      email: this.userForm.value.email!,
      role: this.userForm.value.role! as UserRole,
      password: this.userForm.value.password!
    };
    this.userService.createUser(userData).subscribe({
      next: () => {
        this.showUserModal.set(false);
        this.loadData();
      },
      error: (err) => alert(err.error?.detail ?? 'Failed to create user profile')
    });
  }

  toggleUserStatus(user: User): void {
    const newStatus = !user.is_active;
    this.userService.updateUser(user.id, { is_active: newStatus }).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Error updating status', err)
    });
  }

  deleteUser(id: number): void {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    this.userService.deleteUser(id).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Error deleting user', err)
    });
  }

  closeModal(): void {
    this.showAdminModal.set(false);
    this.showUserModal.set(false);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
