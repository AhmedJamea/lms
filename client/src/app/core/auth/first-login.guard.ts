import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const firstLoginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    if (authService.mustChangePassword()) {
      if (state.url !== '/change-password') {
        router.navigate(['/change-password']);
        return false;
      }
      return true;
    } else {
      if (state.url === '/change-password') {
        router.navigate(['/dashboard']);
        return false;
      }
    }
  }

  return true;
};
