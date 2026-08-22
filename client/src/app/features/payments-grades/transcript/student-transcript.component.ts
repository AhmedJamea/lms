import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AcademicService } from '../../../core/services/academic.service';
import { StudentTranscript } from '../../../core/models/academic.model';

@Component({
  selector: 'app-student-transcript',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="transcript-section fade-in">
      <div class="section-header">
        <h3>Academic Transcript</h3>
        <div class="gpa-badge glass-panel" *ngIf="transcript()">
          <span class="label">Cumulative GPA</span>
          <span class="gpa-val">{{ transcript()?.cumulative_gpa | number:'1.2-2' }}</span>
        </div>
      </div>

      <div class="card glass-panel">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Credits</th>
                <th>Grade Obtained</th>
                <th>Grade Points</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let g of transcript()?.grades">
                <td class="font-mono">{{ g.course_code }}</td>
                <td class="course-name">{{ g.course_name }}</td>
                <td>{{ g.credits }}</td>
                <td>
                  <span class="grade-pill" [ngClass]="getGradeClass(g.grade_value)">
                    {{ g.grade_value }}
                  </span>
                </td>
                <td class="font-mono">{{ g.gpa_points | number:'1.1-1' }}</td>
              </tr>
              <tr *ngIf="!transcript() || transcript()?.grades?.length === 0">
                <td colspan="5" class="text-center">No academic grades recorded on your transcript.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .transcript-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .gpa-badge {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 1.25rem;
      border-radius: 2rem;
      border: 1px solid rgba(129, 140, 248, 0.2);
    }
    .gpa-badge .label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9ca3af;
    }
    .gpa-badge .gpa-val {
      font-size: 1.5rem;
      font-weight: 700;
      color: #818cf8;
    }
    .card {
      padding: 1.5rem;
      border-radius: 1rem;
    }
    .table-container {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .data-table th {
      padding: 1rem;
      color: #818cf8;
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--panel-border, rgba(255, 255, 255, 0.08));
    }
    .data-table td {
      padding: 1rem;
      color: #d1d5db;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--panel-border, rgba(255, 255, 255, 0.05));
    }
    .course-name {
      font-weight: 500;
      color: #f3f4f6;
    }
    .font-mono {
      font-family: monospace;
    }
    .grade-pill {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      border-radius: 0.25rem;
      font-weight: 600;
      font-size: 0.75rem;
    }
    .grade-a {
      background: rgba(16, 185, 129, 0.1);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .grade-b {
      background: rgba(59, 130, 246, 0.1);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }
    .grade-c {
      background: rgba(245, 158, 11, 0.1);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }
    .grade-f {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .text-center {
      text-align: center;
      color: #9ca3af;
      padding: 2rem !important;
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
export class StudentTranscriptComponent implements OnInit {
  private academicService = inject(AcademicService);
  transcript = signal<StudentTranscript | null>(null);

  ngOnInit(): void {
    this.academicService.getStudentTranscript().subscribe({
      next: (data) => this.transcript.set(data),
      error: (err) => console.error('Error fetching transcript', err)
    });
  }

  getGradeClass(grade: string): string {
    const cleanGrade = grade.trim().toUpperCase()[0];
    if (cleanGrade === 'A') return 'grade-a';
    if (cleanGrade === 'B') return 'grade-b';
    if (cleanGrade === 'C' || cleanGrade === 'D') return 'grade-c';
    return 'grade-f';
  }
}
