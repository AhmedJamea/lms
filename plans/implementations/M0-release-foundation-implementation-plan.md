# M0 Implementation Plan — Release Foundation

**Status:** Draft — approval required before coding  
**Owner:** Product/engineering team  
**Approved by:** Pending  
**Target release:** LMS V1

## 1. Objective and measurable success criteria

Establish a production-ready technical and user-interface foundation for the LMS before new school-operation features are built.

- Production configuration, secrets, database, migrations, logging, health checks, and CORS policy operate without source-code changes.
- The existing FastAPI and Angular applications build and test in CI; critical authentication and authorization workflows have automated coverage.
- The frontend uses an accessible responsive shell, supports Arabic RTL and English LTR, and exposes consistent loading, empty, validation, error, success, and destructive-action confirmation states.
- No deployment ships default credentials, hard-coded production URLs, development JWT secrets, wildcard credentialed CORS, or browser-native operational alerts/confirmations.
- The release team can deploy, monitor, back up, restore, and roll back the service using documented runbooks.

## 2. Scope

### Included

- PostgreSQL support, Alembic migrations, migration verification, and a documented development/test/production database workflow.
- Environment-specific settings, secret validation, CORS allow-list configuration, security headers, safe API-error envelope, request IDs, structured logs, health/readiness endpoints, and audit-event foundation.
- CI quality gates for backend tests and static checks, Angular build/test/type checks, dependency/security scanning, and an end-to-end smoke workflow.
- Frontend design tokens, typography, RTL/LTR direction handling, responsive layout, accessible reusable components, route-based application shell, lazy loading, permission-aware navigation, centralized API configuration, and standard feedback/error behavior.
- Replacement of ad-hoc `alert`, `confirm`, console-only user failures, and hard-coded `http://127.0.0.1:8000/api/v1` client configuration.
- Deployment, backup/restore, monitoring, incident, rollback, and release-checklist documentation.

### Excluded

- New academic hierarchy, school profile, facilities, roles/permissions, timetable, examination, promotion, or fee-schedule business features (M1–M4).
- A full user-data migration to the new M1 identity model.
- Multi-school tenancy, parent portals, and mobile-native applications.

## 3. Product decisions requiring confirmation

| Decision | Recommendation | Owner | Due before |
|---|---|---|---|
| Hosting and deployment topology | Containerized API/client, managed PostgreSQL, environment-specific CI/CD deployment | Product/operations | Infrastructure implementation |
| Identity/session policy | Short-lived access token plus rotated, server-revocable refresh-token sessions; secure HttpOnly refresh cookie where frontend/API share a trusted domain | Product/security | Auth hardening |
| Tenant model | Single-school V1, but add `school_id` only when M1 product decision explicitly requires multi-tenancy | Product | M1 data model |
| Supported browsers/devices | Latest two Chrome, Edge, Firefox, Safari; mobile widths from 320px upward | Product | UI test matrix |
| Language policy | Arabic-first UI with RTL; English alternative and language persisted per user/browser | Product | Design-system work |
| Accessibility standard | WCAG 2.2 AA | Product | UI component acceptance |
| Data retention/RPO/RTO | Define backup frequency, retention, recovery-point and recovery-time objectives | Product/operations | Backup design |
| Email/password recovery | Confirm provider, sender identity, reset policy, and whether it belongs to M0 release security baseline | Product | Auth completion |
| Observability provider | Choose managed logs/metrics/error tracking and alert recipients | Operations | Monitoring work |

## 4. Current-state assessment

### Backend

- `server/core/database.py` uses SQLite and `Base.metadata.create_all()` at startup. It includes an ad-hoc `ALTER TABLE` operation; neither approach supplies ordered, reviewable schema migration nor safe rollback.
- `server/core/config.py` has development JWT defaults in source. `server/core/database.py` seeds a predictable `superadmin@lms.com` account with a documented password if the database is empty.
- `server/core/main.py` configures `allow_origins=["*"]` together with credentials, and contains only a basic `/health` endpoint.
- Authentication creates stateless JWT refresh tokens with no refresh-session persistence, rotation, revocation, logout invalidation, rate limiting, password-reset flow, or security-event audit trail.
- Existing API modules are FastAPI vertical slices (`auth`, `users`, `academic`, `payments`, `attendance`, `payroll`) with async SQLAlchemy and Pydantic. They require common error, logging, authorization/audit, and configuration services without prematurely rewriting domain features.
- Existing pytest API tests cover current modules but share the local SQLite database and rely on global initialization; test isolation and production-like PostgreSQL integration coverage are missing.

### Frontend

- Angular 18 uses standalone components and functional interceptors, but a single `AdminDashboardComponent` owns a large tab-switched experience. The route table exposes only login, password change, dashboard, locked state, and payroll child routes.
- `AuthService` hard-codes the local API URL and stores access token plus user data in `localStorage`; it derives display name from the email and does not perform refresh/retry/session-expiry management.
- Global CSS is a dark, English-first glassmorphism treatment with no documented token system, responsive breakpoint system, direction support, component accessibility contract, or light/print treatment.
- Screens use `alert`, `confirm`, and console-only errors. Forms, tables, feedback, loading, empty, paging, filtering, and destructive actions are implemented inconsistently inside feature components.
- Current role navigation is based on four broad roles and will need to integrate with M1’s permission model without duplicating authorization logic in the client.

### Delivery and operations

- No CI configuration, container definition, deployment configuration, migration tooling, environment template, operational runbook, or explicit dependency manifest for the Python service was located during initial review.
- The worktree already contains user-owned uncommitted files and changes; M0 work must avoid overwriting or reformatting unrelated files.

## 5. Proposed architecture

### Data model and migrations

1. Add a backend dependency manifest/lock strategy and Alembic configuration compatible with async SQLAlchemy.
2. Make PostgreSQL the default deployment target. Preserve SQLite only for explicitly supported local fast tests if it remains compatible; do not treat it as migration validation.
3. Create an initial Alembic baseline from the current model schema, then add forward-only revisions for new foundational tables/columns. Production migration command must run before application startup, not from the API process.
4. Add `audit_events` with immutable event ID, actor/user reference where available, action, target type/ID, request ID, timestamp, source metadata, and redacted before/after payload. Do not log passwords, tokens, unredacted financial/grade data, or sensitive request bodies.
5. Design a `refresh_sessions` table only if the approved auth policy uses server-revocable refresh sessions. Store a hash/JTI, expiration, revocation, device metadata, and audit references—not raw tokens.
6. Test upgrades from an empty database and a representative MVP database; document backup before migration and restore/rollback procedures. Schema downgrades are for development only unless explicitly proven safe.

### Backend/API

- Restructure settings into typed environment configuration: `APP_ENV`, `DATABASE_URL`, secret values, allowed origins, log level, trusted hosts, cookie/security flags, and provider credentials. Production startup must fail closed if required secrets/origins are absent or default.
- Add an application factory or equivalent composition boundary so tests can inject configuration and databases without mutating production defaults.
- Configure narrowly scoped CORS using an environment allow-list; credentials only for approved origins. Add trusted-host, HTTPS redirect/proxy, security-header, and request-size policy appropriate to the selected deployment topology.
- Add middleware for generated/propagated request IDs, structured JSON logs, latency/status capture, and normalized unhandled-error responses. Preserve FastAPI/Pydantic validation detail in a stable documented envelope.
- Split `/health` into liveness (process alive) and readiness (database/migration/dependency readiness) with no sensitive detail exposed publicly.
- Add authentication protections: login throttling, generic credential failures, access-token expiry handling, approved refresh/session flow, logout/revocation behavior, password policy, and security audit events. Password reset is included only if approved in Section 3.
- Add an audit-event service and dependency hooks to record sensitive existing actions (authentication, password changes, user administration, payments, payroll, grade changes) without changing their business behavior.
- Generate and publish OpenAPI from FastAPI; define a versioned API error format and deprecation conventions before M1 endpoints expand the surface.

### Frontend/UX

- Add environment files and an injectable API configuration token; remove hard-coded URLs from services.
- Introduce a small native Angular UI foundation rather than coupling M0 to an unapproved third-party component library: CSS custom-property tokens, typography scale, spacing, breakpoints, elevation, semantic colors, focus states, and print tokens. A later library choice requires a separate approval.
- Add a direction/language service that applies `dir` and `lang` to the document root, uses Arabic-capable font fallbacks, uses logical CSS properties, and avoids left/right-only layout rules.
- Replace the dashboard shell with authenticated application layout routes: mobile navigation, desktop sidebar, top bar, breadcrumbs/page titles, skip link, route-level loading/error handling, and feature route lazy loading. Existing features are migrated one at a time with no behavior change in M0.
- Implement shared components/services: button, form field and validation summary, select/input/date control wrappers as appropriate, dialog/confirmation service, toast/notification service, loading indicator, empty state, error/retry state, table primitives, pagination, and API-error mapper. All controls require keyboard operation, visible focus, labelled inputs, semantic status messages, and minimum target sizes.
- Centralize HTTP behavior: auth attachment, 401 handling/approved refresh flow, normalized errors, request ID exposure for support, and no user-visible silent failures.
- Retain route guards as a user-experience measure only; backend remains the permission authority. Build a capability-based navigation interface ready for M1 without introducing the M1 permission schema prematurely.
- Establish frontend analytics/error monitoring only after privacy approval; do not capture tokens, sensitive student data, financial amounts, or grade content.

### Security and operations

- Containerize client and API as separately versioned deployable artifacts; publish a local orchestration example with PostgreSQL but no production secrets.
- Add CI stages: dependency install/cache, backend lint/type/test, migration upgrade test against PostgreSQL, frontend lint/type/build/test, dependency vulnerability scan, and browser smoke tests. Fail on high/critical vulnerabilities unless explicitly waived and recorded.
- Add environment-specific deployment with immutable artifacts, a pre-deploy migration job, readiness-gated rollout, retained prior version, and documented rollback path.
- Define backup schedules and encrypted storage from confirmed RPO/RTO; automate backup verification and rehearse restore using a disposable environment.
- Configure metrics, structured logs, error tracking, database health, uptime checks, release/version tagging, and alerts with responsible owners.

## 6. Work breakdown and order of implementation

| Step | Deliverable | Dependencies | Verification |
|---|---|---|---|
| 1 | Confirm Section 3 product/operations decisions and create architecture decision records | Product/operations input | Signed decisions; no open blockers affecting design |
| 2 | Add backend dependency manifest, config contract, `.env.example`, and startup validation | Step 1 | Configuration unit tests; production-default startup fails safely |
| 3 | Add PostgreSQL local/test setup, Alembic baseline, migration commands, and isolated test fixtures | Steps 1–2 | Fresh upgrade, representative upgrade, and PostgreSQL integration test pass |
| 4 | Add request/error/logging/audit foundations plus liveness/readiness endpoints | Steps 2–3 | API contract tests; redaction and request-ID tests |
| 5 | Harden auth/session/CORS/security headers according to approved policy | Steps 2–4 | Auth abuse, expiry, logout/revocation, CORS, and authorization regression tests |
| 6 | Build Angular environment/API configuration and design-system primitives | Step 1 | Production build; RTL/LTR visual and accessibility component tests |
| 7 | Add app shell, route structure, shared feedback/dialog/form/table patterns, and migrate existing screens incrementally | Step 6 | Mobile/desktop keyboard and screen-reader checks; existing workflow regression suite |
| 8 | Add centralized HTTP error/auth lifecycle handling and monitoring hooks | Steps 4–7 | Offline, validation, 401, 403, 429, 5xx, and retry behavior tests |
| 9 | Add containers, CI/CD checks, scan policy, monitoring, backup/restore, deployment and rollback runbooks | Steps 3–8 and infrastructure decisions | Pipeline run, restore rehearsal, rollback rehearsal, alert test |
| 10 | Conduct M0 UAT, security/accessibility review, and release-gate sign-off | All prior steps | M0 acceptance checklist approved |

## 7. Test and acceptance strategy

- **Backend unit tests:** settings validation, secret/default rejection, error mapping, audit redaction, token/session lifecycle, rate-limit policy, CORS policy, and authorization regression.
- **API/integration tests:** run against ephemeral PostgreSQL; verify migrations, readiness failures, current auth/user/academic/payment/attendance/payroll endpoints, validation error contracts, request IDs, audit events, and no data leakage.
- **Migration tests:** upgrade empty and seeded MVP fixture databases; confirm data preservation and indexes/constraints; test restore before/after a failed release rehearsal.
- **Frontend component tests:** RTL/LTR document direction, labels/focus/keyboard interaction, validation summary, dialog focus trapping, toast announcements, loading/error/empty states, responsive navigation, and API URL injection.
- **End-to-end smoke tests:** login, forced password change, authorized dashboard access, unauthorized deep-link denial, API unavailable state, session expiry/approved refresh behavior, and at least one existing admin/teacher/student workflow.
- **Accessibility/manual QA:** keyboard-only and screen-reader review of shell/components; browser matrix; 320px, tablet, desktop, print, Arabic/English reviews; automated axe checks in CI where practical.
- **Operations QA:** deployment, readiness-gated rollout, log correlation, alert routing, backup restore, and rollback rehearsal.

## 8. Rollout and rollback

1. Provision isolated development/staging/production environments with distinct secrets and PostgreSQL databases.
2. Rehearse the Alembic baseline and production configuration in staging using scrubbed representative data; create and verify a backup before every production migration.
3. Release backend config/migration/audit foundations before frontend client changes that rely on them. Use feature flags only for incomplete UI-shell migration and new auth flows.
4. Deploy schema migrations as a dedicated job, wait for readiness, deploy immutable backend/client artifacts, then execute smoke checks and monitor error/latency/auth indicators.
5. Roll back client/backend artifact immediately for behavioral regressions. Database rollback uses restore/recovery procedure unless the specific migration has an approved, tested downgrade; never run destructive downgrade by default.
6. Publish support notes, known limitations, incident contacts, and a completed go/no-go checklist before declaring M0 complete.

## 9. Risks and mitigations

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| PostgreSQL migration changes implicit SQLite behavior | Data integrity or runtime failures | Baseline/rehearsal migrations, PostgreSQL integration tests, backup and restore rehearsal | Backend |
| Refresh-token redesign changes active sessions | User lockout or weakened security | Approve policy first; staged release with clear forced re-login plan | Security/backend |
| UI shell rewrite regresses existing workflows | Operational disruption | Strangler migration by route/component, E2E regression suite, feature flags | Frontend |
| Arabic/RTL support is added cosmetically only | Poor usability and accessibility | Logical CSS, Arabic font testing, native Arabic UAT, RTL visual tests | Frontend/product |
| Infrastructure/provider decisions are delayed | M0 cannot prove production readiness | Time-box decision workshop; record defaults/owners before Step 2 | Product/operations |
| New audit logs expose sensitive data | Privacy/compliance breach | Allow-listed schemas, redaction tests, restricted log access and retention | Security/backend |
| Existing user-owned worktree changes collide with M0 | Loss of work or merge friction | Keep commits/scope isolated; inspect status before edits; never reset unrelated changes | Engineering |

## 10. Decision and change log

| Date | Decision/change | Rationale | Approved by |
|---|---|---|---|
| 2026-08-22 | Initial M0 implementation plan created | Satisfies the mandatory milestone-start planning gate | Pending |
