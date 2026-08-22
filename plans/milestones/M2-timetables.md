# M2 — Timetables

## Goal

Provide dependable class scheduling without teacher, class, room, or shared-resource clashes, and publish the appropriate timetable to each user.

## Scope

- Subject catalog and instructional assignments: subject, grade/section, teacher, periods per week, and academic term.
- Configurable period definitions, weekdays, school calendar exceptions, and schedule publication state.
- Timetable slots tied to sections and physical/shared resources.
- Transactionally enforced conflict detection for overlapping teacher, section, room, laboratory, playground, and other resource bookings.
- Teacher, student, supervisor, and administrator timetable queries; print/export-friendly views.
- Change auditing and clear conflict explanations.

## Acceptance criteria

- Conflicting schedules cannot be saved, including concurrent requests.
- Teachers and students can see their own published schedules without access to unrelated schedules.
- Administrators can filter, amend, publish, and export schedules with an audit trail.

## Dependencies and decisions

- Requires M1 academic hierarchy, facilities, people, permissions, and calendar.
- Confirm time-zone, weekend, period model, substitutions, and whether schedule changes require approval.
