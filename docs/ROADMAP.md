# Project Roadmap

## Purpose

This roadmap defines the planned development path for the coin catalogue and is maintained against the verified implementation state.

A roadmap item is not, by itself, an architectural commitment. Significant architectural decisions are explicitly accepted and recorded in `docs/DECISIONS.md`.

## Development Principles

- Work incrementally in small, verifiable steps.
- Keep documentation synchronized with actual implementation.
- Prefer simple solutions over premature complexity.
- Avoid speculative functionality before it is needed.
- Review the project documentation before each major phase.
- Do not treat a proposed change as accepted until it has been explicitly reviewed and approved.

## Phase 1 — Development Environment

**Status:** Complete

Established the Docker Dev Container, Python/uv environment, Node.js/Vue/Vite environment, host-browser access, and repository development workflow.

## Phase 2 — Application Skeleton

**Status:** Complete

Established the FastAPI application, health endpoint, separate development servers, Vite `/api` proxy, and verified frontend-to-backend development flow.

## Phase 3 — Database Foundation

**Status:** Complete

Established SQLite, SQLAlchemy, Alembic, the initial coin/reference schema, database behavior tests, and the accepted core coin data model.

## Phase 4 — Coin Entry and Browser

**Status:** Complete

Phase 4 has grown into the first usable catalogue slice and now includes functionality originally planned for later phases because it was required to make the workflow useful and verifiable.

Implemented:

- coin creation, retrieval, update, archive, and restore;
- soft deletion for archived coins;
- seven reference dictionaries with CRUD UI/API;
- dictionary-reference deletion protection;
- coin entry form with dictionary-backed selectors;
- Grid and List coin browsing;
- coin details;
- editing;
- fixed bottom navigation;
- coin image association and serving;
- primary awers/rewers image replacement;
- additional image upload/deletion;
- accepted external-file image storage convention;
- Playwright UI coverage for current coin/image workflows;
- cross-era date-range behavior where numeric years are not compared across BC/AD eras.

Final verification is complete: the backend tests and Ruff checks passed, the frontend production build passed, the current Playwright coin suite passed with 5 tests, manual cross-era entry was verified, and the final working tree was clean.

## Historical Scope Adjustment

The original roadmap placed image management, the full coin browser, and editing in later phases. During implementation these capabilities were pulled into Phase 4 because the first usable catalogue workflow required them.

Those original phase numbers are therefore retained below as historical roadmap placeholders rather than representing unimplemented work.

## Phase 5 — Spreadsheet Import

**Status:** Not started

Planned work:

- inspect existing XLS/XLSX structure;
- define source-to-model mappings;
- define validation rules;
- define duplicate handling;
- implement import;
- implement import error reporting;
- test with representative data.

## Phase 6 — Image Management

**Status:** Partially absorbed into Phase 4

The initial image-management capability is implemented. The remaining future work may include richer image workflows, thumbnail generation, bulk operations, and further image metadata if justified.

The accepted storage and naming rules are documented in `docs/IMAGE_STORAGE_DECISION.md`.

## Phase 7 — Coin Browser

**Status:** Partially absorbed into Phase 4

The basic Grid/List browser, details, active/archived views, and navigation are implemented. Pagination or other large-collection optimization remains future work if required.

## Phase 8 — Search and Filtering

**Status:** Not started

Planned work:

- define searchable fields;
- implement basic search;
- implement filtering;
- evaluate sorting;
- optimize queries if required.

## Phase 9 — Collections, Categories and Tags

**Status:** Partially implemented / future expansion

Category data structures are already present in the current application. A broader user-facing collection/tag model and filtering workflow remain future work.

## Phase 10 — Editing and Data Management

**Status:** Partially absorbed into Phase 4

Coin metadata editing is implemented. Future work may extend editing to additional organization and collection-management features.

## Phase 11 — Backup and Export

**Status:** Not started

Planned work:

- define backup strategy;
- define database backup process;
- define image backup process;
- evaluate metadata export;
- evaluate full catalogue export.

## Phase 12 — Testing and Quality

**Status:** In progress as an ongoing concern

Automated backend and Playwright UI testing already exists. Future work includes broader integration coverage, CI checks, and additional quality automation.

## Phase 13 — Packaging and Deployment

**Status:** Not started

Planned work:

- define supported deployment model;
- prepare production runtime;
- document deployment;
- document backup and recovery;
- verify supported host platforms.

## Future / Optional Areas

Possible future extensions include:

- OCR;
- automated image analysis;
- numismatic image recognition;
- price/value tracking;
- market data integration;
- advanced statistics and reporting;
- advanced collection analytics;
- additional import/export formats;
- mobile-oriented interface;
- multi-user support;
- authentication and authorization;
- external catalogue integrations.

These are not committed until justified by actual requirements.

## Documentation Review Before Each Major Phase

Before each major phase, review:

1. `AGENTS.md`;
2. `docs/ARCHITECTURE.md`;
3. `docs/DECISIONS.md`;
4. `docs/PROGRESS.md`;
5. `docs/ROADMAP.md`.

If the review reveals a direction or architecture change, stop before implementation and discuss it explicitly. Once agreed, update the relevant documentation before proceeding.

## Roadmap Maintenance

When the project evolves:

- update `docs/PROGRESS.md` with verified implementation status;
- update this roadmap when sequence or scope changes;
- record significant architectural decisions in `docs/DECISIONS.md` after explicit approval;
- update `docs/ARCHITECTURE.md` when technical architecture changes;
- keep documentation changes close to the implementation changes they describe.
