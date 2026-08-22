# M4 — Approval, Reporting, and Promotion

## Goal

Turn results into controlled academic records that can be approved, locked, reported, used for second-round decisions, and used to progress or graduate students.

## Scope

- Explicit grade-document states: draft, submitted, reviewed, approved, locked, and superseded/corrected under controlled policy.
- Configurable approval stages and authorities; immutable lock behavior with audited exceptional correction workflow.
- Rankings, top-student and failure reports by subject, section, grade, and stage; printable/exportable outputs.
- Second-round grade workflow for students awaiting final progression.
- Promotion engine that evaluates final locked outcomes, advances eligible students, leaves second-round candidates pending, marks terminal-grade students as graduated/inactive, and preserves full archive history.
- Fee schedules linked to academic grade/stage, carried forward through promotion, plus authorized installments and exemptions.

## Acceptance criteria

- Unapproved results cannot be used by reports, promotion, or official exports.
- Locked results cannot be changed except through an authorized, audited correction process.
- Promotion produces a reviewable dry run and an idempotent final execution with complete student-history records.
- Graduated students remain searchable in an authorized archive and are no longer active students.

## Dependencies and decisions

- Requires M3 valid result data and M1 academic/identity model.
- Confirm approval chain, statutory reports, promotion rules, second-round policy, fee calculation rules, exemption authority, and retention policy.
