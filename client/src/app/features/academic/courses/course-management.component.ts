import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicService } from '../../../core/services/academic.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { Grade, Course } from '../../../core/models/academic.model';
import { User, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-course-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="academic-section fade-in">
      <div class="section-header">
        <h3>Course Mappings & Assignments</h3>
        <button class="btn btn-primary" (click)="openCourseModal()">Define New Course</button>
      </div>

      <div class="glass-panel card">
        <h4>Subject Mappings</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Code</th>
              <th>Name</th>
              <th>Target Grade</th>
              <th>Assigned Teacher</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let course of courses()">
              <td>{{ course.id }}</td>
              <td><span class="code-badge">{{ course.code }}</span></td>
              <td>{{ course.name }}</td>
              <td>{{ course.grade_name }}</td>
              <td>
                <span *ngIf="course.teacher_name" class="teacher-badge">{{ course.teacher_name }}</span>
                <span *ngIf="!course.teacher_name" class="text-muted">Unassigned</span>
              </td>
              <td>
                <button class="btn btn-secondary btn-sm" (click)="openCourseModal(course)">Edit</button>
                <button class="btn btn-danger btn-sm m-left" (click)="deleteCourse(course.id)">Delete</button>
              </td>
            </tr>
            <tr *ngIf="courses().length === 0">
              <td colspan="6" class="text-center">No courses defined.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Course Modal Overlay -->
    <div *ngIf="showCourseModal()" class="modal-overlay">
      <div class="glass-panel modal-content">
        <h3>{{ isEditMode() ? 'Edit Course Settings' : 'Define New Course' }}</h3>
        <form [formGroup]="courseForm" (ngSubmit)="submitCourseForm()">
          <div class="form-group">
            <label for="courseName">Course Name</label>
            <input id="courseName" type="text" formControlName="name" class="form-control" placeholder="e.g. Algebra II" />
          </div>
          <div class="form-group">
            <label for="courseCode">Course Code</label>
            <input id="courseCode" type="text" formControlName="code" class="form-control" placeholder="e.g. MATH-201" />
          </div>
          <div class="form-group">
            <label for="courseGrade">Target Grade/Level</label>
            <select id="courseGrade" formControlName="grade_id" class="form-control">
              <option value="">-- Choose Grade --</option>
              <option *ngFor="let g of grades()" [value]="g.id">{{ g.name }} ({{ g.academic_year }})</option>
            </select>
          </div>
          <div class="form-group">
            <label for="courseTeacher">Assign Teacher (Optional)</label>
            <select id="courseTeacher" formControlName="teacher_id" class="form-control">
              <option value="">-- Unassigned / None --</option>
              <option *ngFor="let t of teachers()" [value]="t.id">{{ t.name }} ({{ t.email }})</option>
            </select>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary m-left">{{ isEditMode() ? 'Save Changes' : 'Create Course' }}</button>
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
    .card {
      padding: 1.5rem;
      min-height: 500px;
    }
    .card h4 {
      margin-top: 0;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 0.5rem;
      color: #818cf8;
      letter-spacing: 0.05em;
    }
    .code-badge {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }
    .teacher-badge {
      font-size: 0.8rem;
      font-weight: 500;
      padding: 0.2rem 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    .text-muted {
      color: var(--text-secondary);
      font-style: italic;
      font-size: 0.85rem;
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
export class CourseManagementComponent implements OnInit {
  private academicService = inject(AcademicService);
  private userService = inject(UserManagementService);
  private fb = inject(FormBuilder);

  courses = signal<Course[]>([]);
  grades = signal<Grade[]>([]);
  teachers = signal<User[]>([]);

  showCourseModal = signal(false);
  isEditMode = signal(false);
  editingCourseId: number | null = null;

  courseForm = this.fb.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    grade_id: ['', Validators.required],
    teacher_id: ['']
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.academicService.getCourses().subscribe({
      next: (data) => this.courses.set(data),
      error: (err) => console.error('Error fetching courses', err)
    });

    this.academicService.getGrades().subscribe({
      next: (data) => this.grades.set(data),
      error: (err) => console.error('Error fetching grades', err)
    });

    // Fetch active teachers for assignment select
    this.userService.getUsers('TEACHER', true).subscribe({
      next: (data) => this.teachers.set(data),
      error: (err) => console.error('Error fetching teachers', err)
    });
  }

  openCourseModal(course?: Course): void {
    if (course) {
      this.isEditMode.set(true);
      this.editingCourseId = course.id;
      this.courseForm.reset({
        name: course.name,
        code: course.code,
        grade_id: String(course.grade_id),
        teacher_id: course.teacher_id ? String(course.teacher_id) : ''
      });
    } else {
      this.isEditMode.set(false);
      this.editingCourseId = null;
      this.courseForm.reset({
        name: '',
        code: '',
        grade_id: '',
        teacher_id: ''
      });
    }
    this.showCourseModal.set(true);
  }

  closeModal(): void {
    this.showCourseModal.set(false);
  }

  submitCourseForm(): void {
    if (this.courseForm.invalid) return;

    const teacherVal = this.courseForm.value.teacher_id;
    const courseData = {
      name: this.courseForm.value.name!,
      code: this.courseForm.value.code!,
      grade_id: Number(this.courseForm.value.grade_id!),
      teacher_id: teacherVal ? Number(teacherVal) : null
    };

    if (this.isEditMode() && this.editingCourseId !== null) {
      this.academicService.updateCourse(this.editingCourseId, courseData).subscribe({
        next: () => {
          this.closeModal();
          this.loadData();
        },
        error: (err) => alert(err.error?.detail ?? 'Failed to update course')
      });
    } else {
      this.academicService.createCourse(courseData).subscribe({
        next: () => {
          this.closeModal();
          this.loadData();
        },
        error: (err) => alert(err.error?.detail ?? 'Failed to define course')
      });
    }
  }

  deleteCourse(id: number): void {
    if (!confirm('Are you sure you want to delete this course mapping? All associated timetables and exams will be deleted!')) return;
    this.academicService.deleteCourse(id).subscribe({
      next: () => this.loadData(),
      error: (err) => alert(err.error?.detail ?? 'Failed to delete course')
    });
  }
}
