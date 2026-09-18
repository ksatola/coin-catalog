# Documentation Update Plan

> Temporary working document for the documentation cleanup following Phase 8.
> This file should be removed after the documentation update is completed and verified.

## Goal

Synchronize the repository documentation with the verified Phase 8 implementation state and establish clear responsibilities between documentation files.

The documentation should serve four purposes:

1. persistence/reference for AI-assisted development;
2. verified progress tracking;
3. planned scope and roadmap;
4. technical and operational project documentation.

`AGENTS.md` is intentionally excluded from this update.

## Target Documentation Structure

Keep:

```
AGENTS.md
README.md
docs/
├── ARCHITECTURE.md
├── CODING_STANDARDS.md
├── DECISIONS.md
├── DEVELOPMENT.md
├── PROGRESS.md
└── ROADMAP.md
```

Temporary working file:

```
docs/DOCUMENTATION_UPDATE_PLAN.md
```

The following existing documents are candidates for consolidation/removal after their relevant information has been migrated:

```
docs/DEV_SCRIPTS.md
docs/GIT_WORKFLOW.md
docs/IMAGE_STORAGE_DECISION.md
docs/COLLECTIONS.md
docs/COLLECTIONS_UI_AND_INTEGRITY.md
frontend/README.md
```

No file is to be deleted until its useful content has been reviewed and incorporated into the appropriate permanent document.

## Responsibilities

### README.md

Human-facing project overview.

Should contain:

- project purpose;
- current implementation status;
- concise architecture summary;
- main application capabilities;
- quick local start;
- links to the permanent documentation;
- current Phase 8 status.

It should not duplicate detailed technical documentation.

### docs/ARCHITECTURE.md

Current technical architecture and implemented system behavior.

Should describe:

- repository structure;
- backend/frontend architecture;
- database and migrations;
- API structure;
- data model;
- collection model;
- collection-aware filesystem;
- image storage;
- coin/collection relationships;
- frontend routing;
- important implementation constraints.

Relevant stable technical rules from `COLLECTIONS.md` and `COLLECTIONS_UI_AND_INTEGRITY.md` should be incorporated here where they describe current implemented behavior.

This document describes the **current implemented architecture**, not future plans.

### docs/DEVELOPMENT.md

Single operational reference for development.

Should contain:

- host requirements;
- Dev Container;
- repository paths;
- start/stop/restart/status commands;
- backend commands;
- frontend commands;
- migrations;
- linting/formatting/type checking;
- backend tests;
- Playwright tests;
- production build;
- development server URLs;
- Git/branch workflow currently used by the project;
- practical verification procedure.

`DEV_SCRIPTS.md` and the practical parts of `GIT_WORKFLOW.md` should be incorporated here before those files are removed.

All shell examples should use the canonical repository path:

```bash
/workspaces/coin-catalog/
```

### docs/PROGRESS.md

Verified implementation history.

Should contain:

- completed phases;
- verified features;
- verification evidence;
- important implementation milestones;
- known unverified areas;
- concise history of completed work.

Phase 8 completion notes from `COLLECTIONS_UI_AND_INTEGRITY.md` should be preserved here as verified history where appropriate.

Only verified state should be presented as completed.

### docs/ROADMAP.md

Future work only.

Should contain:

- completed phases as a short historical reference where useful;
- current/future planned phases;
- planned features;
- dependencies or sequencing of future work.

Implemented Phase 8 functionality must not be described as planned work.

### docs/DECISIONS.md

Architectural and significant product decisions.

Should contain:

- accepted decisions;
- superseded decisions;
- rationale;
- consequences;
- relationship between older and newer decisions.

Relevant accepted agreements from `COLLECTIONS.md` and `COLLECTIONS_UI_AND_INTEGRITY.md` should be retained here when they represent architectural or product decisions rather than implementation detail.

D-030 / image-storage history must remain understandable, with D-034 represented as the current collection-aware decision.

### docs/CODING_STANDARDS.md

Coding and quality conventions.

Keep focused on:

- Python conventions;
- TypeScript/Vue conventions;
- testing conventions;
- documentation conventions;
- Git conventions;
- general implementation quality rules.

No major restructuring is planned unless the review identifies stale information.

## Files To Consolidate

### DEV_SCRIPTS.md

Review all useful information and move it into `DEVELOPMENT.md`.

After migration and verification, remove the standalone file.

### GIT_WORKFLOW.md

Move the practical development/branch/merge instructions into `DEVELOPMENT.md`.

Preserve any information that is useful for normal project work.

After migration and verification, remove the standalone file.

### IMAGE_STORAGE_DECISION.md

Do not keep a second, potentially stale description of image storage.

Move historical decision information into `DECISIONS.md` where appropriate and keep the current implementation/storage rules in `ARCHITECTURE.md`.

After migration and verification, remove the standalone file.

### COLLECTIONS.md

This is currently the canonical Phase 8 functional specification for Collections.

Review it carefully against the completed implementation. Do not retain it as a second source of truth if its current-state rules can be represented cleanly in the permanent documentation.

Migrate:

- stable domain rules and architecture into `ARCHITECTURE.md`;
- accepted product/architecture agreements into `DECISIONS.md`;
- verified completion facts into `PROGRESS.md`;
- genuinely future requirements, if any remain, into `ROADMAP.md`.

After migration and verification, remove the standalone file unless the review demonstrates that a separate Collections specification is still justified.

### COLLECTIONS_UI_AND_INTEGRITY.md

This document mixes accepted Phase 8 UI/integrity agreements, implementation order, completed follow-ups, and test strategy.

It should not remain as an additional current source of truth.

Migrate:

- current architecture/integrity invariants into `ARCHITECTURE.md`;
- accepted UI/product agreements into `DECISIONS.md`;
- completed Phase 8 work and verification notes into `PROGRESS.md`;
- only genuinely outstanding future work into `ROADMAP.md`;
- operational test commands/verification procedures into `DEVELOPMENT.md`.

After migration and verification, remove the standalone file.

### frontend/README.md

This is the generic README generated by the Vite/Vue template and does not contain project-specific documentation.

No project-specific content needs to be migrated from the current file.

After verification, remove the standalone file.

## Execution Order

1. Create this temporary plan as the working reference.
2. Re-read all current Markdown files and verify their claims against the current Phase 8 source tree.
3. Review `DECISIONS.md`, especially the image-storage decisions D-030 and D-034.
4. Review `COLLECTIONS.md` and `COLLECTIONS_UI_AND_INTEGRITY.md` against the current implementation and distinguish:
   - current architecture;
   - accepted decisions;
   - verified history;
   - future work;
   - obsolete implementation plans.
5. Review the current backend routes, models, migrations, and filesystem implementation.
6. Review the current frontend routes and collection-related UI.
7. Prepare the complete new content for:
   - `README.md`
   - `docs/ARCHITECTURE.md`
   - `docs/DEVELOPMENT.md`
   - `docs/PROGRESS.md`
   - `docs/ROADMAP.md`
   - `docs/DECISIONS.md`
   - `docs/CODING_STANDARDS.md` only if changes are actually required.
8. Prepare the consolidation/removal diffs for:
   - `docs/DEV_SCRIPTS.md`
   - `docs/GIT_WORKFLOW.md`
   - `docs/IMAGE_STORAGE_DECISION.md`
   - `docs/COLLECTIONS.md`
   - `docs/COLLECTIONS_UI_AND_INTEGRITY.md`
   - `frontend/README.md`
9. Present all proposed changes for review before any repository write.
10. Wait for explicit approval (`zgoda`).
11. Re-fetch every file being modified immediately before writing and use its current Git blob SHA.
12. Apply the approved documentation changes incrementally.
13. Verify that all Markdown links and cross-references are valid.
14. Run the relevant project verification commands.
15. Re-read the resulting documentation and compare it against the actual implementation.
16. Remove this temporary plan once the documentation update is complete and verified.

## Important Constraints

- `AGENTS.md` must remain unchanged.
- Do not invent implementation details.
- Do not mark functionality as verified unless there is evidence.
- Do not describe implemented Phase 8 functionality as future/planned work.
- Avoid duplicating the same technical fact across multiple documents unless the duplication serves a clear navigation purpose.
- Preserve useful historical decisions rather than silently deleting them.
- Keep changes incremental and minimal.
- Before every GitHub write, follow the approval procedure defined in `AGENTS.md`.
