# Coin Catalog — Development Progress

This document records the verified current state of the project. A task is marked complete only after it has been implemented and verified where verification is applicable.

---

## Current Phase

**Phase 4 — Coin Entry and Browser**

Phase 1 — Development Environment, Phase 2 — Application Skeleton, and Phase 3 — Database Foundation are complete. Phase 4 now provides the first usable catalogue workflow: coin entry, SQLite persistence, browsing, details, editing, archive/restore, dictionary management, and coin images.

---

## Phase 1 — Development Environment

**Status:** Complete

Verified:

- Docker Dev Container and VS Code / Dev Containers workflow.
- Python 3.14.7, Node.js 24.20.0, and uv 0.12.10 in the container.
- Workspace `/workspaces/coin-catalog`.
- Separate `backend/` and `frontend/` projects.
- Vue 3 + TypeScript + Vite frontend.
- Backend Python project with uv.
- Host-browser access to the Vite development server.
- Development helper scripts: `start`, `stop`, `restart`, `status`.

---

## Phase 2 — Application Skeleton

**Status:** Complete

Verified:

- FastAPI application and `GET /health` endpoint.
- Separate backend/frontend development servers.
- Vite `/api` proxy to FastAPI.
- End-to-end browser health flow.

---

## Phase 3 — Database Foundation

**Status:** Complete

Verified:

- SQLite database at `/workspaces/coin-catalog/data/coin-catalog.db`.
- SQLAlchemy engine/session configuration.
- Alembic migrations.
- Initial coin/reference schema.
- `e6df2f7c0c11` initial migration.
- Database behavior tests.
- Ruff lint and format checks.
- Core coin date representation using year + era endpoints.
- `currency` excluded from the initial schema.

---

## Phase 4 — Coin Entry and Browser

**Status:** Complete

### Backend

- [x] Coin create, list, detail, update, archive, and restore APIs.
- [x] Soft-delete behavior through `is_deleted`.
- [x] Active and archived coin list separation.
- [x] Seven dictionary list/create/update/delete APIs.
- [x] Reference-protected dictionary deletion.
- [x] Era deletion protection for both date endpoints.
- [x] Category and coin-category data structures.
- [x] Coin-image metadata and image APIs.

### Frontend

- [x] Dictionary editor for all seven dictionaries.
- [x] Dictionary-backed coin selectors.
- [x] Coin creation form.
- [x] Coin editing form.
- [x] Basic form validation.
- [x] Grid/List coin browser.
- [x] Coin details.
- [x] Active/archived navigation and actions.
- [x] Fixed bottom navigation.
- [x] Primary awers/rewers image handling.
- [x] Additional image upload and deletion.
- [x] Explicit primary-image replacement behavior.
- [x] Cross-era date ranges are accepted without comparing numeric years across eras.

### Automated UI verification

The Playwright coin suite passes:

```text
5 passed
```

Covered scenarios include:

- awers replacement;
- cancelling an awers replacement;
- rewers replacement;
- additional image upload;
- cross-era date range such as `476 BC → 1 AD`.

The frontend production build also passed.

### Backend verification

The backend test suite passed with:

```text
62 passed, 2 warnings
```

Ruff lint and format checks also passed after the final formatting fixes.

### Manual verification

The cross-era coin-entry scenario was verified manually in the browser and saved successfully.

### Repository state

The final local verification reported a clean working tree.

Phase 4 is therefore complete.

---

## Image Management

**Status:** Initial implementation complete

The accepted storage decision D-030 is implemented for the current workflow:

- top-level `images/` directory;
- Git-ignored image files;
- flat storage without per-coin directories;
- six-digit coin IDs in filenames;
- one primary awers and one primary rewers;
- sequential additional images;
- SQLite image metadata;
- JPG image serving;
- explicit replacement confirmation.

Further image features may be added later if justified.

---

## Phase 5 — Spreadsheet Import

**Status:** Not started

Planned: inspect XLS/XLSX data, define mappings and validation, implement import and error reporting, and test with representative data.

---

## Phase 6 — Image Management

**Status:** Initial capability absorbed into Phase 4

Further image-management enhancements remain optional future work.

---

## Phase 7 — Coin Browser

**Status:** Basic capability absorbed into Phase 4

The current browser and detail views are implemented. Large-collection pagination or optimization can be added when required.

---

## Phase 8 — Search and Filtering

**Status:** Not started

Planned: searchable fields, basic search, filtering, sorting, and query optimization where required.

---

## Phase 9 — Collections, Categories and Tags

**Status:** Partially implemented / future expansion

Category structures exist. Broader collection/tag organization and filtering remain future work.

---

## Phase 10 — Editing and Data Management

**Status:** Coin editing absorbed into Phase 4

Further organization and collection-management editing remains future work.

---

## Phase 11 — Backup and Export

**Status:** Not started

Planned: database/image backup strategy and useful metadata/catalogue export.

---

## Phase 12 — Testing and Quality

**Status:** Ongoing

Backend pytest and Ruff checks and Playwright UI coverage are established. Broader integration tests, CI checks, and further quality automation remain future work.

---

## Phase 13 — Packaging and Deployment

**Status:** Not started

Production runtime, deployment, backup/recovery documentation, and supported-host verification remain future work.

---

## Current Next Step

Begin the next approved development task, with Phase 5 — Spreadsheet Import currently first in the roadmap.

Before each major phase, review `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, and `docs/ROADMAP.md`. Stop for discussion if the review identifies a direction or architecture change.

---

## Change Log

### 2026-09-15

- Closed Phase 4 after the final local verification pass.
- Recorded passing backend tests, Ruff checks, frontend production build, and the 5-scenario Playwright coin suite.
- Recorded the clean final working tree.
- Updated the next step to Phase 5 — Spreadsheet Import.

### 2026-09-14

- Updated the Phase 4 record to match the implemented coin entry, browser, editing, archive/restore, dictionary, and image workflows.
- Recorded Playwright UI verification with 5 passing coin scenarios.
- Recorded manual verification of a cross-era `476 BC → 1 AD` coin range.
- Recorded the accepted image-storage convention and its current implementation.
- Updated the roadmap relationship between Phase 4 and the originally planned image/browser/editing phases.
- Added Playwright as a frontend development/test dependency.
- Removed the invalid frontend validation that compared numeric years without considering their eras.
