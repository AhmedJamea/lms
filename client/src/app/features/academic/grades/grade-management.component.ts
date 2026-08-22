import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicService } from '../../../core/services/academic.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { Grade, Enrolment } from '../../../core/models/academic.model';
import { User, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-grade-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="academic-section fade-in">
      <div class="section-header">
        <h3>Grade & Class Configuration</h3>
        <button class="btn btn-primary" (click)="openGradeModal()">Configure New Grade</button>
      </div>

      <div class="academic-grid">
        <!-- Grades List -->
        <div class="card glass-panel">
          <h4>Configured Grades</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Level</th>
                <th>Academic Year</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let grade of grades()">
                <td>{{ grade.id }}</td>
                <td>{{ grade.name }}</td>
                <td>{{ grade.level }}</td>
                <td>{{ grade.academic_year }}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="openGradeModal(grade)">Edit</button>
                  <button class="btn btn-danger btn-sm m-left" (click)="deleteGrade(grade.id)">Delete</button>
                </td>
              </tr>
              <tr *ngIf="grades().length === 0">
                <td colspan="5" class="text-center">No grades configured.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Student Enrolments -->
        <div class="card glass-panel">
          <div class="panel-header">
            <h4>Active Student Enrolments</h4>
            <button class="btn btn-primary btn-sm" (click)="openEnrolModal()">Enroll Student</button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Enrolled Grade</th>
                <th>Enrolled At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let enrolment of enrolments()">
                <td>{{ enrolment.student_name }}</td>
                <td>{{ enrolment.grade_name }}</td>
                <td>{{ enrolment.enrolled_at | date:'short' }}</td>
                <td>
                  <button class="btn btn-danger btn-sm" (click)="deleteEnrolment(enrolment.id)">Remove</button>
                </td>
              </tr>
              <tr *ngIf="enrolments().length === 0">
                <td colspan="4" class="text-center">No active enrolments.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Grade Modal Overlay -->
    <div *ngIf="showGradeModal()" class="modal-overlay">
      <div class="glass-panel modal-content">
        <h3>{{ isEditMode() ? 'Edit Grade Level' : 'Configure New Grade' }}</h3>
        <form [formGroup]="gradeForm" (ngSubmit)="submitGradeForm()">
          <div class="form-group">
            <label for="gradeName">Grade/Class Name</label>
            <input id="gradeName" type="text" formControlName="name" class="form-control" placeholder="e.g. Grade 10-A" />
          </div>
          <div class="form-group">
            <label for="gradeLevel">Numeric Level</label>
            <input id="gradeLevel" type="number" formControlName="level" class="form-control" placeholder="e.g. 10" />
          </div>
          <div class="form-group">
            <label for="gradeYear">Academic Year</label>
            <input id="gradeYear" type="text" formControlName="academic_year" class="form-control" placeholder="e.g. 2026-2027" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary m-left">{{ isEditMode() ? 'Save Changes' : 'Create Grade' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Enrolment Modal Overlay -->
    <div *ngIf="showEnrolModal()" class="modal-overlay">
      <div class="glass-panel modal-content">
        <h3>Enroll Student into Grade</h3>
        <form [formGroup]="enrolForm" (ngSubmit)="submitEnrolForm()">
          <div class="form-group">
            <label for="enrolStudent">Select Student</label>
            <select id="enrolStudent" formControlName="student_id" class="form-control">
              <option value="">-- Choose Student --</option>
              <option *ngFor="let s of students()" [value]="s.id">{{ s.name }} ({{ s.email }})</option>
            </select>
          </div>
          <div class="form-group">
            <label for="enrolGrade">Target Grade/Class</label>
            <select id="enrolGrade" formControlName="grade_id" class="form-control">
              <option value="">-- Choose Grade --</option>
              <option *ngFor="let g of grades()" [value]="g.id">{{ g.name }} ({{ g.academic_year }})</option>
            </select>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary m-left">Enroll Student</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .academic-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .academic-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 1024px) {
      .academic-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .card {
      padding: 1.5rem;
      min-height: 400px;
    }
    .card h4 {
      margin-top: 0;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 0.5rem;
      color: #818cf8;
      letter-spacing: 0.05em;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 0.5rem;
    }
    .panel-header h4 {
      margin: 0;
      border: none;
      padding: 0;
    }
    .m-left {
      margin-left: 0.5rem;
    }
    .text-center {
      text-align: center;
      color: var(--text-secondary);
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
export class GradeManagementComponent implements OnInit {
  private academicService = inject(AcademicService);
  private userService = inject(UserManagementService);
  private fb = inject(FormBuilder);

  grades = signal<Grade[]>([]);
  enrolments = signal<Enrolment[]>([]);
  students = signal<User[]>([]);

  showGradeModal = signal(false);
  showEnrolModal = signal(false);
  isEditMode = signal(false);
  editingGradeId: number | null = null;

  gradeForm = this.fb.group({
    name: ['', Validators.required],
    level: [10, [Validators.required, Validators.min(1)]],
    academic_year: ['2026-2027', Validators.required]
  });

  enrolForm = this.fb.group({
    student_id: ['', Validators.required],
    grade_id: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.academicService.getGrades().subscribe({
      next: (data) => this.grades.set(data),
      error: (err) => console.error('Error fetching grades', err)
    });

    this.academicService.getEnrolments().subscribe({
      next: (data) => this.enrolments.set(data),
      error: (err) => console.error('Error fetching enrolments', err)
    });

    // Fetch active students for enrolment select
    this.userService.getUsers('STUDENT', true).subscribe({
      next: (data) => this.students.set(data),
      error: (err) => console.error('Error fetching students', err)
    });
  }

  openGradeModal(grade?: Grade): void {
    if (grade) {
      this.isEditMode.set(true);
      this.editingGradeId = grade.id;
      this.gradeForm.reset({
        name: grade.name,
        level: grade.level,
        academic_year: grade.academic_year
      });
    } else {
      this.isEditMode.set(false);
      this.editingGradeId = null;
      this.gradeForm.reset({
        name: '',
        level: 10,
        academic_year: '2026-2027'
      });
    }
    this.showGradeModal.set(true);
  }

  openEnrolModal(): void {
    this.enrolForm.reset({
      student_id: '',
      grade_id: ''
    });
    this.showEnrolModal.set(true);
  }

  closeModal(): void {
    this.showGradeModal.set(false);
    this.showEnrolModal.set(false);
  }

  submitGradeForm(): void {
    if (this.gradeForm.invalid) return;

    const gradeData = {
      name: this.gradeForm.value.name!,
      level: Number(this.gradeForm.value.level!),
      academic_year: this.gradeForm.value.academic_year!
    };

    if (this.isEditMode() && this.editingGradeId !== null) {
      this.academicService.updateGrade(this.editingGradeId, gradeData).subscribe({
        next: () => {
          this.closeModal();
          this.loadData();
        },
        error: (err) => alert(err.error?.detail ?? 'Failed to update grade')
      });
    } else {
      this.academicService.createGrade(gradeData).subscribe({
        next: () => {
          this.closeModal();
          this.loadData();
        },
        error: (err) => alert(err.error?.detail ?? 'Failed to configure grade')
      });
    }
  }

  deleteGrade(id: number): void {
    if (!confirm('Are you sure you want to delete this grade level? All associated courses and enrolments will be removed!')) return;
    this.academicService.deleteGrade(id).subscribe({
      next: () => this.loadData(),
      error: (err) => alert(err.error?.detail ?? 'Failed to delete grade')
    });
  }

  submitEnrolForm(): void {
    if (this.enrolForm.invalid) return;

    const enrolData = {
      student_id: Number(this.enrolForm.value.student_id!),
      grade_id: Number(this.enrolForm.value.grade_id!)
    };

    this.academicService.createEnrolment(enrolData).subscribe({
      next: () => {
        this.closeModal();
        this.loadData();
      },
      error: (err) => alert(err.error?.detail ?? 'Failed to enroll student')
    });
  }

  deleteEnrolment(id: number): void {
    if (!confirm('Are you sure you want to remove this student enrolment?')) return;
    this.academicService.deleteEnrolment(id).subscribe({
      next: () => this.loadData(),
      error: (err) => alert(err.error?.detail ?? 'Failed to remove enrolment')
    });
  }
}
