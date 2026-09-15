# Coin Catalog — AI Development Instructions

## 1. Purpose

Coin Catalog is a personal application for cataloguing and managing a collection of coins.

The application is intended to provide:

- coin cataloguing,
- browsing and viewing coins,
- search and filtering,
- collections and categories,
- tags and favourites,
- management of coin photographs,
- import of existing coin metadata from XLS/XLSX files,
- future extensibility for additional numismatic data and functionality.

The project is developed incrementally. Architectural and product decisions are made together with the project owner.

## 2. Source of Truth

The GitHub repository is the primary persistent source of truth for the project.

Important project knowledge must be recorded in the repository rather than relying exclusively on conversation history.

Relevant documentation:

- `README.md` — project overview and high-level user-facing project information.
- `docs/ARCHITECTURE.md` — current technical architecture.
- `docs/DECISIONS.md` — accepted architectural and significant product decisions.
- `docs/PROGRESS.md` — current implementation status.
- `docs/ROADMAP.md` — planned development phases.
- `docs/DEVELOPMENT.md` — detailed development environment and setup instructions.
- `docs/GIT_WORKFLOW.md` — practical Git branching, development, and merge workflow.
- `docs/CODING_STANDARDS.md` — coding style, quality, documentation, testing, and Git conventions.

When beginning work on the project, review these documents before making significant changes.

## 3. Development Philosophy

The project is developed in small, deliberate increments.

Principles:

1. Prefer simple solutions over unnecessary complexity.
2. Do not introduce technologies or dependencies without a reason.
3. Do not implement future functionality prematurely.
4. Keep the application portable between Windows and macOS hosts.
5. Keep application development and runtime inside Docker/Dev Containers wherever practical.
6. Maintain reproducible development environments.
7. Keep documentation synchronized with the actual project state.
8. Verify changes before considering a development step complete.
9. Follow `docs/CODING_STANDARDS.md` for code quality and development conventions.

The project owner should understand and approve significant technical or architectural decisions.

## 4. Verified State / Fact-Based Development

All information about the current project state, completed work, configuration, and test results must be based on facts and verified whenever possible.

The assistant must not present assumptions, predictions, intended actions, or planned work as facts. The assistant must not claim that an action was completed when it was not actually completed, or confirm a state that has not been checked.

**The assistant must always answer based on verified facts. The assistant must not guess, speculate, invent, fabricate, or hallucinate information. If the available evidence is insufficient to answer reliably, the assistant must explicitly state that it cannot verify the information instead of filling the gap with an assumption. When comparing repository code with documentation, the assistant must inspect both and report only differences supported by the actual repository state.**

If something does not work, has not been completed, or cannot be verified, the actual state must be stated clearly. The next step should then be a concrete diagnostic or corrective attempt. Continue with further attempts until a verified result is obtained or a clear limitation is established.

`docs/PROGRESS.md` must reflect only the verified current state of the project. A task may be marked complete only after it has actually been completed and verified.

When reporting status, clearly distinguish between:

- **Verified** — directly confirmed by an actual check, test, tool result, or other reliable evidence.
- **Not verified** — not yet checked or lacking sufficient evidence.
- **Planned** — intended future work, not completed work.
- **Failed** — attempted but did not work.

## 5. Architecture

The currently accepted architecture is:

### Development environment

- Docker
- VS Code
- VS Code Dev Containers
- Linux-based development container

### Backend

- Python
- `uv` for Python dependency and environment management
- FastAPI

### Database

- SQLite
- SQLAlchemy
- Alembic for schema migrations

### Frontend

- Vue 3
- TypeScript
- Vite

### Application access

The application is primarily accessed through a web browser running on the host machine.

The application itself should run inside the development/runtime container.

The host platform should not be required to install project-specific runtime dependencies.

## 6. Cross-Platform Requirement

The project must support development and execution on:

- Windows 11
- macOS

The development environment should therefore be containerized and reproducible.

Do not introduce host-specific assumptions unless they are unavoidable and documented.

## 7. Dependency Management

Python dependencies are managed using `uv`.

The project should maintain:

- `pyproject.toml` — declared project dependencies and configuration.
- `uv.lock` — locked dependency versions.

Dependency policy:

- Explicitly define and pin versions of installed development tools and project dependencies wherever the relevant tooling supports it.
- Use stable, production-quality releases.
- Do not use alpha, beta, release-candidate, nightly, or otherwise experimental/prerelease versions by default.
- Do not automatically track the newest available release.
- Treat dependency upgrades as deliberate maintenance changes that require compatibility review and testing.

When adding a dependency:

1. Determine whether it is actually necessary.
2. Prefer a well-maintained, established, stable dependency.
3. Select an explicit stable version compatible with the project.
4. Add it using the appropriate project tooling (`uv` for Python dependencies).
5. Ensure the relevant lock file is updated.
6. Document significant dependency decisions when appropriate.

The project owner should be able to understand the purpose of important dependencies.

## 8. Frontend Guidelines

The frontend uses Vue 3 with TypeScript and Vite.

Avoid unnecessary client-side complexity.

Prefer:

- Vue components,
- TypeScript,
- established Vue ecosystem libraries where justified,
- reusable components,
- clear separation between presentation and application logic.

Avoid writing raw JavaScript when the same functionality can naturally be implemented using Vue and TypeScript.

Do not introduce a large frontend framework or state-management solution without first evaluating whether it is necessary for the application's actual requirements.

## 9. Backend Guidelines

FastAPI is responsible for:

- HTTP endpoints,
- application/business logic,
- validation,
- database interaction through the appropriate data-access layer,
- file/image management,
- importing external data,
- communication with the frontend.

Keep business logic separate from HTTP route definitions where practical.

Do not put substantial application logic directly into route handlers.

## 10. Database Guidelines

SQLite is the current database technology.

SQLAlchemy should provide the application's database abstraction.

Database schema changes must be deliberate and documented.

Do not modify the data model merely to support speculative future functionality.

Alembic is used to version and apply database schema changes. Autogenerated migrations must be reviewed before they are considered accepted.

## 11. Images and Files

Coin photographs are external files, not database blobs, unless a future decision explicitly changes this architecture.

The database should store metadata and references to photographs.

The application should avoid unnecessarily duplicating large original image files.

Thumbnail generation and image processing should be implemented as separate services/components when they become necessary.

## 12. Architectural Decisions

Significant architectural decisions must be recorded in:

docs/DECISIONS.md

A decision should normally contain:

- identifier,
- title,
- status,
- date,
- context,
- decision,
- rationale,
- consequences.

A suggestion made during conversation is not automatically an accepted decision.

The project owner has final approval over significant architectural changes.

When an accepted architectural decision changes:

1. Discuss the proposed change.
2. Obtain project-owner approval.
3. Update `docs/DECISIONS.md`.
4. Update `docs/ARCHITECTURE.md`.
5. Update other affected documentation.
6. Implement the change.

## 13. Progress Tracking

Development progress is tracked in:

docs/PROGRESS.md

A task should only be marked complete after it has actually been implemented and, where applicable, verified.

Do not mark work as completed based solely on intention or planned implementation.

## 14. Working Incrementally

When implementing a requested change:

1. Inspect the current repository state.
2. Read the relevant project documentation.
3. Identify the smallest useful change.
4. Explain important decisions before implementation when user approval is required.
5. Implement the change.
6. Test or otherwise verify it.
7. Update relevant documentation.
8. Update `docs/PROGRESS.md`.
9. Commit the completed change.

Do not combine unrelated development steps merely for convenience.

## 15. Git Workflow

GitHub is the project's version-control and collaboration platform.

`main` is the stable branch. Development work must be performed on a dedicated working branch and must not be committed directly to `main`.

For a normal development phase, use a branch named:

```text
phase-N-short-description
```

Examples include `phase-3-database-foundation` and `phase-4-coin-data-model`.

For smaller independent work, `feature/`, `fix/`, and `docs/` branches may be used where appropriate.

Working branches are developed, run, tested, and documented normally. A working branch is merged into `main` only after its relevant implementation, tests, documentation, and verification are complete, preferably through a pull request.

The project does not use a permanent `develop` branch.

Prefer small, meaningful commits. Commit messages should describe the actual change.

Examples:

- `docs: establish project architecture`
- `build: add development container`
- `feat: add initial FastAPI application`
- `feat: add coin database model`
- `test: add coin repository tests`

Never rewrite published history unless explicitly requested.

See `docs/GIT_WORKFLOW.md` for the practical GitHub Desktop and VS Code workflow.

## 16. Documentation as Code

Documentation is part of the project.

If a change affects:

- setup,
- architecture,
- dependencies,
- development workflow,
- application behaviour,
- database design,
- deployment,
- or project decisions,

update the appropriate documentation as part of the same change.

Documentation must describe the actual current state, not an intended future state.

## 17. Repository-First Collaboration Workflow

The GitHub repository is the canonical source of truth for both project state and durable collaboration rules.

When the user has verified and pushed a change to the working branch:

1. Treat the pushed repository state as the authoritative state.
2. Inspect the relevant files and commits directly in GitHub rather than asking the user to copy or print file contents that are already available in the repository.
3. Review the pushed change against the accepted project decisions and documentation.
4. Continue from the verified repository state.

The assistant should not ask the user to repeat `cat`, paste file contents, or otherwise manually reproduce repository content when that content can be inspected directly in GitHub.

## 18. AI Collaboration Rules

The AI assistant should act as a development collaborator, not as the sole decision maker.

The assistant should:

- explain significant decisions,
- identify trade-offs,
- avoid unnecessary complexity,
- ask for approval before significant architectural changes,
- preserve accepted decisions,
- consult repository documentation,
- keep progress documentation current,
- avoid silently changing established architecture.

When the user explicitly changes a requirement or decision, update the project documentation accordingly.

When repository state conflicts with conversation context, the repository documentation and current user instructions should be reconciled explicitly rather than silently assuming one is correct.

## 19. Change Approval Before Repository Writes

Before writing any change to the GitHub repository, the assistant must:

1. Inspect the current repository state.
2. Prepare the proposed change.
3. Show the user what will be changed, preferably as a focused diff or complete replacement content when appropriate.
4. Explain briefly why the change is needed.
5. Wait for explicit user approval.
6. Only after approval, write the change to the repository.

The user's approval to continue working, proceed to the next step, or perform testing does not by itself constitute approval to write a specific change to the repository.

No code, documentation, configuration, migration, or other repository content may be created, modified, deleted, committed, or otherwise written to GitHub without explicit approval of the proposed change.

Verification commands may be proposed and, when appropriate, run without repository writes. Repository modifications remain subject to explicit user approval.

### 19.1 Preferred Change Presentation

For repository changes, the assistant should present the proposed result in a form that is practical for the project owner to review.

For code, configuration, and documentation files, prefer showing the complete proposed file content over unified diffs when the change spans multiple lines or files. The project owner should not be required to manually apply patches or reconstruct files from diffs.

The preferred workflow is:

1. Inspect the current repository state.
2. Prepare the complete proposed file contents.
3. Show the proposed contents to the project owner.
4. Explain briefly why the changes are needed.
5. Wait for explicit approval.
6. After approval, write the approved changes to the repository.
7. Verify the resulting repository state.

The project owner is responsible for reviewing and approving the proposed result; the assistant should minimize manual file-editing work required from the project owner.

### 19.2 GitHub Write Safety

Before updating an existing repository file, the assistant must re-fetch the file from the exact target branch immediately before the write and use the returned **Git blob SHA** for that file update.

A Git blob SHA must never be treated as a commit SHA. Commit SHAs identify commits; blob SHAs identify file contents.

After any GitHub write failure, including `409 Conflict`, `422 Unprocessable Entity`, or an equivalent connector error, the assistant must not retry blindly and must not change repository structure merely to work around the failure.

Instead:

1. Re-read the target branch reference.
2. Confirm the current branch HEAD commit SHA.
3. Re-fetch the affected file from that exact branch.
4. Distinguish the file's blob SHA from the branch's commit SHA.
5. Diagnose the mismatch or connector problem before attempting another write.

If the connector continues to return contradictory results, report the exact error and stop modifying the repository until the problem is understood or a safe, equivalent write path is established.

## 20. Current Development Stage

The project is currently in:

**Phase 5 — Search and Filtering**

Phase 1 — Development Environment, Phase 2 — Application Skeleton, Phase 3 — Database Foundation, and Phase 4 — Coin Entry and Browser have been completed and verified.

Phase 5 provides user-facing search and filtering for the coin browser, including tokenized text search, dictionary and category filters, recursive category filtering, date-range filtering, media-presence filters, status filtering, and deterministic sorting.
