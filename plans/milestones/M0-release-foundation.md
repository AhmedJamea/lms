# M0 — Release Foundation

## Goal

Replace MVP-only operational assumptions with a secure, deployable technical foundation and establish the reusable frontend system required by all later milestones.

## Scope

- Move production persistence from SQLite to PostgreSQL and introduce Alembic migrations, including a repeatable local/dev database workflow.
- Replace hard-coded/default secrets, credentials, URLs, and permissive CORS with environment-specific configuration and a documented secret-management approach.
- Add structured logging, request/error correlation, health/readiness checks, audit-event foundations, backup/restore procedures, and API documentation.
- Establish test layers: backend unit/API/integration tests, frontend component tests, and critical end-to-end smoke tests in CI.
- Create the frontend production foundation: RTL and Arabic support, English support, responsive layout, accessible design tokens, app shell, route-based feature loading, permission-aware navigation, standard feedback states, and reusable controls.
- Remove browser-native confirmation/error patterns and replace them with accessible dialogs, notifications, and consistent field/server-error handling.

## Acceptance criteria

- A new environment can be configured without code edits or committed secrets.
- Schema upgrades and rollback/recovery procedures are documented and tested against PostgreSQL.
- The app exposes safe health/readiness checks and produces actionable logs without leaking sensitive data.
- CI blocks merges on agreed test, lint, type-check, and build failures.
- The frontend is usable on common desktop and mobile widths, keyboard-accessible, and renders Arabic RTL content correctly.

## Dependencies and decisions

- Select hosting, PostgreSQL provider, object storage, CI provider, and deployment topology.
- Confirm supported browsers, accessibility target (recommended: WCAG 2.2 AA), Arabic/English content policy, and data-retention requirements.

## Exclusions

- New school operations such as sections, exams, promotion, and fee schedules belong to M1–M4.
