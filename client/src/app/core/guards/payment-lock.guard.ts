import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { PaymentLockService } from '../services/payment-lock.service';

export const paymentLockGuard: CanActivateFn = () => {
  const paymentLockService = inject(PaymentLockService);
  const router = inject(Router);

  if (paymentLockService.isLocked()) {
    router.navigate(['/locked']);
    return false;
  }
  return true;
};
