import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PaymentLockService {
  readonly isLocked = signal<boolean>(false);

  clearLock(): void {
    this.isLocked.set(false);
  }

  setLock(): void {
    this.isLocked.set(true);
  }
}
