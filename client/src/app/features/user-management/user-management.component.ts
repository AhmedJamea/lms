import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel">
      <h3>User Management</h3>
      <p>Users are managed directly through the main Admin Dashboard.</p>
    </div>
  `,
  styles: [``]
})
export class UserManagementComponent {}
