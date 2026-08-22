import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <div class="glass-panel login-card">
        <div class="header">
          <h2>Learning Management System</h2>
          <p class="subtitle">Sign in to your account</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="form-control"
              placeholder="e.g. name@lms.com"
            />
            <div *ngIf="submitted && f['email'].errors" class="text-danger error-msg">
              <span *ngIf="f['email'].errors['required']">Email is required.</span>
              <span *ngIf="f['email'].errors['email']">Enter a valid email address.</span>
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              class="form-control"
              placeholder="Enter your password"
            />
            <div *ngIf="submitted && f['password'].errors" class="text-danger error-msg">
              <span *ngIf="f['password'].errors['required']">Password is required.</span>
              <span *ngIf="f['password'].errors['minlength']">Password must be at least 8 characters.</span>
            </div>
          </div>

          <div *ngIf="errorMessage()" class="text-danger error-container">
            {{ errorMessage() }}
          </div>

          <button type="submit" class="btn btn-primary w-full" [disabled]="loading()">
            {{ loading() ? 'Authenticating...' : 'Sign In' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .login-card {
      width: 100%;
      max-width: 440px;
    }
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .subtitle {
      color: var(--text-secondary);
      margin-top: 0.5rem;
    }
    .error-msg {
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }
    .error-container {
      margin-bottom: 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      padding: 0.75rem;
      font-size: 0.9rem;
      text-align: center;
    }
    .w-full {
      width: 100%;
      margin-top: 1rem;
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  submitted = false;
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage.set(null);

    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);
    const credentials = {
      email: this.loginForm.value.email!,
      password: this.loginForm.value.password!
    };

    this.authService.login(credentials).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.must_change_password) {
          this.router.navigate(['/change-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.detail ?? 'Authentication failed. Please check credentials.');
      }
    });
  }
}
