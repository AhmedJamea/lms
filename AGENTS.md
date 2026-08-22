# Delivery Planning Gate

## Mandatory milestone-start gate

Before making implementation changes for any roadmap milestone:

1. Create `plans/implementations/<milestone-id>-implementation-plan.md` from `plans/implementations/IMPLEMENTATION_PLAN_TEMPLATE.md`.
2. Complete every section using the current codebase and the corresponding file in `plans/milestones/`.
3. Obtain user approval of that detailed plan in the task before coding begins, unless the user explicitly asks to skip approval.
4. Keep the plan current as decisions or scope change; record material deviations in its decision log.

Do not start a milestone, create its migrations, alter its API, or change its frontend until this gate is satisfied. Small documentation-only edits are exempt.

## Roadmap authority

`plans/milestones/` is the authoritative V1 roadmap. `requirements.docx` is the primary source for school-operation requirements. When they conflict or an item is unclear, stop and request a product decision rather than inventing policy.
