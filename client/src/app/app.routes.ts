import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { ChangePasswordComponent } from './features/auth/change-password/change-password.component';
import { AdminDashboardComponent } from './features/admin-dashboard/admin-dashboard.component';
import { authGuard } from './core/auth/auth.guard';
import { firstLoginGuard } from './core/auth/first-login.guard';
import { paymentLockGuard } from './core/guards/payment-lock.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';
import { LockedComponent } from './features/payments-grades/locked/locked.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [firstLoginGuard] },
  {
    path: 'change-password',
    component: ChangePasswordComponent,
    canActivate: [authGuard, firstLoginGuard]
  },
  {
    path: 'dashboard',
    component: AdminDashboardComponent,
    canActivate: [authGuard, firstLoginGuard, paymentLockGuard]
  },
  {
    path: 'locked',
    component: LockedComponent,
    canActivate: [authGuard]
  },
  {
    path: 'payroll',
    canActivate: [authGuard, firstLoginGuard, superAdminGuard],
    children: [
      {
        path: 'staff-manager',
        loadComponent: () =>
          import('./features/payroll/staff-payroll-manager/staff-payroll-manager.component')
            .then(m => m.StaffPayrollManagerComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/payroll/financial-dashboard/financial-dashboard.component')
            .then(m => m.FinancialDashboardComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];

