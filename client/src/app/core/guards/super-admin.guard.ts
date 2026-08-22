import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const superAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()?.role === 'SUPER_ADMIN') {
    return true;
  }
  
  router.navigate(['/dashboard']);
  return false;
};
