import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { PaymentLockService } from '../services/payment-lock.service';

export const paymentInterceptor: HttpInterceptorFn = (req, next) => {
  const paymentLockService = inject(PaymentLockService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 403 && error.error?.detail === 'PAYMENT_REQUIRED') {
        paymentLockService.setLock();
        router.navigate(['/locked']);
      }
      return throwError(() => error);
    })
  );
};
