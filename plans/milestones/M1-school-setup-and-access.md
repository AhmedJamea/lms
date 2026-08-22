# M1 — School Setup and Access

## Goal

Allow an authorized school to configure its identity, academic structure, facilities, people, and precise permissions before operational schedules or results are created.

## Scope

- School profile: Arabic/English name, logo, contact and official web channels, geographic location, and establishment information.
- Academic calendar: academic years and terms.
- Academic hierarchy: stage → grade → section/class, including section code/number, floor, capacity, and homeroom supervisor.
- Facilities and shared resources such as classrooms, laboratories, and playgrounds.
- Student and staff profiles separate from authentication accounts, with active/inactive/graduated states and relationship/history support.
- Expand the current four roles into configurable role/permission assignments for the positions named in the requirements: system admin, principal, vice principal, department head, teacher, assistant teacher, student affairs, control officer, HR, accountant, transport, inventory, social worker, nurse/doctor, and librarian.
- Permission-aware APIs and UI for create, update, deactivate, delete where policy permits, and print/export authorization.

## Acceptance criteria

- A principal can configure a complete academic year with stages, grades, sections, rooms, and assigned supervisors.
- A section cannot exceed capacity when students are assigned to it.
- A user sees and can execute only authorized actions; privileged changes are audited.
- Existing users, grades, courses, and enrolments have a tested migration path to the new model.

## Dependencies and decisions

- Requires M0 configuration, migrations, audit foundation, app shell, and permission framework.
- Confirm whether this is single-school V1 or multi-school tenancy, identifier formats, guardian/parent scope, and role permission matrix.
