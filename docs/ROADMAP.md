# Project Roadmap

## Purpose

This roadmap defines the planned development path for the coin catalog application. It provides a shared sequence of work and a way to track the project at a high level.

A roadmap item is not, by itself, an architectural commitment. Significant architectural decisions must also be explicitly accepted and recorded in `docs/DECISIONS.md`.

The roadmap may change as the project develops and new information becomes available.

## Development Principles

- Work incrementally in small, verifiable steps.
- Keep documentation synchronized with the actual state of the project.
- Prefer simple solutions over premature complexity.
- Avoid implementing speculative functionality before it is needed.
- Review the project documentation before starting each major development phase to confirm that the architecture, decisions, roadmap, and progress are still aligned.
- Do not treat a proposed change as an accepted decision until it has been explicitly reviewed and approved.

## Phase 1 — Development Environment

**Status:** Complete

Establish a reproducible, cross-platform development environment based on Docker Dev Containers.

The repository now contains separate `backend/` and `frontend/` project directories. The backend Python project and the Vue frontend foundation have both been created and verified inside the Dev Container. Host-browser access to the Vite development server has also been verified.

Completed work:

- Configure Docker.
- Configure VS Code and Dev Containers.
- Select and configure the Python version.
- Configure Python and `uv` inside the Dev Container.
- Select and configure the Node.js version.
- Configure Vue 3, TypeScript, and Vite.
- Build and verify the Dev Container.
- Verify Python tooling.
- Verify frontend tooling.
- Verify browser access from the host system.
- Create the initial frontend foundation.
- Document the verified development environment and frontend workflow.
- Create the frontend development checkpoint.

Remaining environment checklist items that require explicit host-level verification are tracked in `docs/PROGRESS.md` and will not block discussion of the application skeleton.

## Phase 2 — Application Skeleton

**Status:** Complete

Create the minimal backend/frontend application structure and establish communication between the Vue frontend and FastAPI backend.

Completed work includes the minimal FastAPI application and health endpoint, separate frontend/backend development servers, the Vite `/api` development proxy, and the frontend health-status display. The complete frontend-to-backend development flow was verified in the host browser.

## Phase 3 — Database Foundation

**Status:** Complete

Establish SQLite and SQLAlchemy as the database foundation, configure database sessions, introduce Alembic migrations, and implement the initial coin catalogue data model.

Completed work includes the initial schema design, SQLAlchemy models for `coin` and its reference tables, the first Alembic migration, and focused database behavior tests. The initial model includes the required coin metadata and relationships accepted for the catalogue foundation.

## Phase 4 — Coin Entry and Browser

**Status:** Current

Build the first simple user-facing slice of the application using the existing database model.

Planned work:

- Design a simple coin-entry form.
- Allow creation of a new coin using the existing data model.
- Add basic form validation.
- Build a simple browser for coins stored in the database.
- Display basic coin data in the browser.
- Add a basic detail view for a selected coin.
- Verify the complete flow: form → SQLite persistence → coin list → coin details.

The phase intentionally does not include spreadsheet import, image management, search/filtering, collections/tags, or other advanced functionality.

## Phase 5 — Import Existing Data

Import existing XLS/XLSX descriptions and metadata into the application using an explicit, documented mapping process.

## Phase 6 — Image Management

Integrate the existing JPG coin photographs as external files referenced by application data and establish the initial image organization strategy.

## Phase 7 — Coin Browser

Build the main web interface for browsing the coin collection, including gallery/list presentation and coin detail views.

## Phase 8 — Search and Filtering

Add search, filtering, sorting, and other mechanisms for finding coins efficiently.

## Phase 9 — Collections, Categories and Tags

Introduce user-defined organization mechanisms such as collections, categories, and tags.

## Phase 10 — Editing and Data Management

Add controlled editing of coin metadata and related collection information.

## Phase 11 — Backup and Export

Provide mechanisms for backing up application data and exporting useful collection information.

## Phase 12 — Testing and Quality

Expand automated testing, validation, error handling, documentation, and quality checks appropriate to the application's maturity.

## Phase 13 — Packaging and Deployment

Define and implement a practical deployment/distribution model for the completed application while preserving the cross-platform requirements.

## Future / Optional Areas

The following areas are possible future extensions but are not committed development phases:

- OCR.
- Automated image analysis.
- Numismatic image recognition.
- Price/value tracking.
- Market data integration.
- Advanced statistics.
- Reporting.
- Advanced collection analytics.
- Additional import/export formats.
- Mobile-oriented interface.
- Multi-user support.
- Authentication and authorization.
- External catalogue integrations.

These items should be evaluated when the core application is mature enough to justify them.

## Documentation Review Before Each Phase

Before beginning each major phase, perform a short documentation review covering at least:

1. `AGENTS.md` — confirm the collaboration and development rules.
2. `docs/ARCHITECTURE.md` — confirm the current technical architecture.
3. `docs/DECISIONS.md` — confirm accepted decisions and identify any decisions that need reconsideration.
4. `docs/PROGRESS.md` — confirm the actual current state of implementation.
5. `docs/ROADMAP.md` — confirm that the planned next phase is still appropriate.

If the review reveals that the project direction, architecture, or assumptions should change, stop before implementation and discuss the change explicitly. Once agreed, update the relevant documentation before proceeding with code changes.

## Roadmap Maintenance

When the project evolves:

- Update `docs/PROGRESS.md` to reflect verified implementation status.
- Update this roadmap if the development sequence or scope changes.
- Record significant architectural decisions in `docs/DECISIONS.md` after explicit approval.
- Update `docs/ARCHITECTURE.md` when the actual technical architecture changes.
- Keep documentation changes close to the implementation changes they describe.
