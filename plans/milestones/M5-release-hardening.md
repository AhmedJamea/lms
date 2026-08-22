# M5 — Release Hardening

## Goal

Prove that V1 is safe and practical to operate in production and produce the artifacts needed for release approval.

## Scope

- Security assessment and remediation: authentication/session behavior, authorization coverage, OWASP controls, file-upload safety, rate limits, headers, and secret rotation.
- Performance and concurrency testing for scheduling, imports, approvals, promotion, reports, and expected user load.
- Backup/restore, data export, incident response, deployment, rollback, monitoring, alerting, and operational runbooks.
- Cross-browser, responsive, RTL, Arabic/English, accessibility, print/export, and end-to-end role workflow QA.
- Data-migration rehearsal, pilot-school UAT, release checklist, support/training materials, and go/no-go decision.

## Acceptance criteria

- Critical workflows pass automated and manual acceptance suites for each supported role.
- Backup restore and deployment rollback are rehearsed successfully.
- Production monitoring, alert thresholds, ownership, and on-call/escalation paths are documented.
- Open high-severity security, data-integrity, and accessibility issues are resolved or explicitly accepted by the release owner.

## Dependencies and decisions

- Requires all V1 capability milestones.
- Confirm production SLOs, pilot data policy, launch support model, release owner, and sign-off authorities.
