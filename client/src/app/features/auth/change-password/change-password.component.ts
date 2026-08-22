import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

// Custom validator to ensure passwords match
export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('new_password');
  const confirmPassword = control.get('confirm_password');

  if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordsMismatch: true });
    return { passwordsMismatch: true };
  }
  return null;
};

// Password complexity validator
export const passwordComplexityValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (!value) return null;

  const hasDigit = /\d/.test(value);
  const hasSpecial = /[^a-zA-Z0-9]/.test(value);

  const isValid = hasDigit && hasSpecial;
  return isValid ? null : { complexityRequirement: true };
};

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="reset-container">
      <div class="glass-panel reset-card">
        <div class="header">
          <h2>Secure Your Account</h2>
          <p class="subtitle">Please change your temporary password to proceed</p>
        </div>

        <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="old_password">Temporary Password</label>
            <input
              id="old_password"
              type="password"
              formControlName="old_password"
              class="form-control"
              placeholder="Enter temporary password"
            />
            <div *ngIf="submitted && f['old_password'].errors" class="text-danger error-msg">
              <span *ngIf="f['old_password'].errors['required']">Temporary password is required.</span>
            </div>
          </div>

          <div class="form-group">
            <label for="new_password">New Password</label>
            <input
              id="new_password"
              type="password"
              formControlName="new_password"
              class="form-control"
              placeholder="Enter new password"
            />
            <div *ngIf="submitted && f['new_password'].errors" class="text-danger error-msg">
              <span *ngIf="f['new_password'].errors['required']">New password is required.</span>
              <span *ngIf="f['new_password'].errors['minlength']">Password must be at least 8 characters.</span>
              <span *ngIf="f['new_password'].errors['complexityRequirement']">
                Password must contain at least one number and one special character.
              </span>
            </div>
          </div>

          <div class="form-group">
            <label for="confirm_password">Confirm New Password</label>
            <input
              id="confirm_password"
              type="password"
              formControlName="confirm_password"
              class="form-control"
              placeholder="Confirm new password"
            />
            <div *ngIf="submitted && f['confirm_password'].errors" class="text-danger error-msg">
              <span *ngIf="f['confirm_password'].errors['required']">Confirmation is required.</span>
              <span *ngIf="f['confirm_password'].errors['passwordsMismatch']">Passwords do not match.</span>
            </div>
          </div>

          <div *ngIf="errorMessage()" class="text-danger error-container">
            {{ errorMessage() }}
          </div>

          <div *ngIf="successMessage()" class="text-success success-container">
            {{ successMessage() }}
          </div>

          <button type="submit" class="btn btn-primary w-full" [disabled]="loading()">
            {{ loading() ? 'Updating Password...' : 'Update Password' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .reset-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .reset-card {
      width: 100%;
      max-width: 460px;
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
    .success-container {
      margin-bottom: 1rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
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
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  submitted = false;
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  resetForm = this.fb.group({
    old_password: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(8), passwordComplexityValidator]],
    confirm_password: ['', Validators.required]
  }, { validators: passwordsMatchValidator });

  get f() {
    return this.resetForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.resetForm.invalid) {
      return;
    }

    this.loading.set(true);
    const payload = {
      old_password: this.resetForm.value.old_password!,
      new_password: this.resetForm.value.new_password!
    };

    this.authService.changePassword(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set('Password updated successfully! Redirecting...');
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.detail ?? 'Failed to update password. Please check temporary password.');
      }
    });
  }
}
