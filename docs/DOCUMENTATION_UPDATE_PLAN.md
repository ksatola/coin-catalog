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

## Execution Order

1. Create this temporary plan as the working reference.
2. Re-read all current Markdown files and verify their claims against the current Phase 8 source tree.
3. Review `DECISIONS.md`, especially the image-storage decisions D-030 and D-034.
4. Review the current backend routes, models, migrations, and filesystem implementation.
5. Review the current frontend routes and collection-related UI.
6. Prepare the complete new content for:
   - `README.md`
   - `docs/ARCHITECTURE.md`
   - `docs/DEVELOPMENT.md`
   - `docs/PROGRESS.md`
   - `docs/ROADMAP.md`
   - `docs/DECISIONS.md`
   - `docs/CODING_STANDARDS.md` only if changes are actually required.
7. Prepare the consolidation/removal diffs for:
   - `docs/DEV_SCRIPTS.md`
   - `docs/GIT_WORKFLOW.md`
   - `docs/IMAGE_STORAGE_DECISION.md`
8. Present all proposed changes for review before any repository write.
9. Wait for explicit approval (`zgoda`).
10. Re-fetch every file being modified immediately before writing and use its current Git blob SHA.
11. Apply the approved documentation changes incrementally.
12. Verify that all Markdown links and cross-references are valid.
13. Run the relevant project verification commands.
14. Re-read the resulting documentation and compare it against the actual implementation.
15. Remove this temporary plan once the documentation update is complete and verified.

## Important Constraints

- `AGENTS.md` must remain unchanged.
- Do not invent implementation details.
- Do not mark functionality as verified unless there is evidence.
- Do not describe implemented Phase 8 functionality as future/planned work.
- Avoid duplicating the same technical fact across multiple documents unless the duplication serves a clear navigation purpose.
- Preserve useful historical decisions rather than silently deleting them.
- Keep changes incremental and minimal.
- Before every GitHub write, follow the approval procedure defined in `AGENTS.md`.
