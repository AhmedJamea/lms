# M3 — Examinations and Grading

## Goal

Run end-to-end examination and result-entry workflows with validated marks, seating, invigilation, bulk import, and clear operational ownership.

## Scope

- Exam definitions by academic year, term, type (monthly, midyear, final, second round), subject, date, and period.
- Examination rooms/committees, candidate distribution by alphabetical or section-based methods, and automatic or controlled seating-number generation.
- Invigilator assignment with principal/assistant designation and prevention of a teacher invigilating their own subject.
- Gradebook by section and subject for authorized teachers/control staff.
- Excel import templates, pre-import validation, row-level error reports, idempotent import handling, and retained import audit records.
- Mark ceilings, absence, cheating, and exemption statuses; visually clear but accessible result states.
- Preliminary analytics for failed and top-performing students by class, grade, stage, and subject.

## Acceptance criteria

- The system blocks conflicting room, candidate, and invigilator conditions defined by policy.
- Mark entry and import reject invalid student, subject, status, or maximum-score values without partial unintended writes.
- Authorized staff can prepare exam logistics and enter results; unauthorized users cannot view or edit them.

## Dependencies and decisions

- Requires M1 data/roles and M2 calendar/rooms where scheduling is shared.
- Confirm grading scale, pass thresholds, rounding, cheating/exemption semantics, import file format, and who may correct submitted grades.
