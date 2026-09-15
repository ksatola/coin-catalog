# Coin Catalog — Development Progress

This document records the current, verified state of the project. A task is marked complete only after it has been implemented and verified where verification is applicable.

---

## Current Phase

**Phase 6 — UI Foundation and Visual System is implemented; final verification is pending.**

Phase 1 — Development Environment, Phase 2 — Application Skeleton, Phase 3 — Database Foundation, Phase 4 — Coin Entry and Browser, and Phase 5 — Search and Filtering are complete and verified.

The final Playwright result verified before the last inline-category fix was **39 passed, 1 failed**. The remaining failure was addressed in the inline category creation flow, but the resulting test run has not yet been independently verified.

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

Implemented and verified:

- coin create, list, detail, update, archive, and restore APIs;
- soft-delete behavior and active/archived separation;
- seven reference dictionaries with CRUD UI/API and deletion protection;
- dictionary-backed coin selectors and coin creation/editing forms;
- Grid/List browser, details, active/archived navigation and actions;
- fixed bottom navigation;
- primary awers/rewers image handling and replacement;
- additional image upload/deletion;
- accepted external-file image storage convention;
- category data structures, backend APIs, category management UI, parent/child relations, cycle prevention, and deletion protection;
- coin-category assignment/removal UI;
- cross-era date-range behavior without comparing numeric years across eras.

Verified UI coverage included 5 coin/image scenarios and 15 category and coin-category scenarios. Backend verification passed with 62 tests; Ruff lint/format and the frontend production build passed. Manual cross-era entry was verified and the final local working tree was clean.

---

## Phase 5 — Search and Filtering

**Status:** Complete

Implemented and verified:

- tokenized text search with normalized whitespace and order-independent AND matching;
- search across coin fields, related reference names, descriptions, sources, eras, years, and categories;
- dictionary, era, year-range, image, video, status, and category filters;
- recursive category filtering with optional subcategory inclusion;
- OR semantics within a filter type and AND semantics between filter types;
- deterministic sorting with ID tie-breaking;
- duplicate-result protection in the coin query;
- user-facing search/filter workflow and reset behavior;
- Playwright coverage for search/filtering UI.

Final local validation passed: backend pytest, Ruff lint, Ruff format check, frontend production build, and the full Playwright UI suite.

---

## Phase 6 — UI Foundation and Visual System

**Status:** Implemented; final verification pending

Implemented:

- consistent application layout and main navigation;
- shared visual foundation for typography, spacing, cards, forms, buttons, messages, focus states, and responsive layouts;
- reusable catalogue presentation components;
- shared active/archive catalogue view structure;
- Gallery, Grid, and List presentation modes;
- persistent view-mode and gallery-column preferences using localStorage;
- responsive coin image gallery with configurable column count;
- consistent coin information presentation across Grid, List, and Detail;
- image viewer with keyboard navigation;
- redesigned coin creation and editing interfaces;
- preserved inline dictionary and category creation workflows;
- redesigned category and dictionary management interfaces;
- updated Playwright UI tests to match the implemented UI;
- automated coverage for the coin image viewer;
- no new domain model, database schema, or API functionality introduced as part of Phase 6.

The latest verified Playwright result before the final inline-category fix was:

```text
39 passed, 1 failed
```

The remaining failure concerned inline category creation. The production flow was subsequently changed to emit the category returned by `POST /api/categories` directly instead of performing a second category-list request. The resulting test run is not yet independently verified.

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
- explicit replacement confirmation;
- byte-preserving storage without JPEG decode/re-encode or resizing.

Further image features may be added later if justified.

---

## Category Management

**Status:** Complete for the current Phase 4 scope

Verified:

- `category` entity with name and description;
- `category_relation` parent/child relationships;
- acyclic category graph validation;
- multiple parents and multiple children;
- category CRUD UI at `/kategorie`;
- relation add/remove UI;
- cycle-error handling;
- deletion protection while a category is used by a coin or category relation;
- `coin_category` many-to-many relationship;
- coin-category assignment/removal UI.

Broader collection/tag organization remains future work.

---

## Spreadsheet Import

**Status:** Not part of the current development plan

The application has no XLS/XLSX import implementation. Collection metadata will be entered manually through the application. No spreadsheet-import phase is currently scheduled.

---

## Broader Collections, Categories and Tags

**Status:** Future expansion

The current category model and user-facing category workflow are implemented. Broader collection/tag organization and related filtering remain future work.

---

## Backup and Export

**Status:** Not started

Planned: database/image backup strategy and useful metadata/catalogue export.

---

## Testing and Quality

**Status:** Ongoing

Backend pytest and Ruff checks and Playwright UI coverage are established. Phase 5 verification is complete. Phase 6 final Playwright verification remains pending. Broader integration tests, CI checks, and further quality automation remain future work.

---

## Packaging and Deployment

**Status:** Not started

Production runtime, deployment, backup/recovery documentation, and supported-host verification remain future work.

---

## Current Next Step

Collection Number — planned as a separate feature branch after completion and final verification of the UI Foundation phase.

The collection number will be a user-facing text value independent from the technical database ID. Planned work includes the database migration, API/model changes, creation/editing, search, display in all relevant views, validation, and automated backend/UI coverage.

---

## Change Log

### 2026-09-15 — Phase 6 implementation record

- Recorded the implemented UI Foundation and Visual System work.
- Recorded the latest known Playwright result as 39 passed and 1 failed.
- Recorded the subsequent inline-category production fix as not yet independently verified.
- Set Collection Number as the next planned feature.

### 2026-09-15 — Phase 6 Roadmap Change

- Approved Phase 6 as UI Foundation and Visual System.
- Replaced the original Phase 6 image-management focus with UI foundation and visual-system work.
- Kept further image-management extensions as optional future work.

### 2026-09-15 — Phase 5

- Completed and verified Phase 5 — Search and Filtering.
- Recorded the implemented search, filtering, recursive category filtering, and sorting behavior.
- Recorded passing backend pytest, Ruff lint, Ruff format, frontend production build, and Playwright verification.

### 2026-09-15 — Phase 4

- Closed Phase 4 after final local verification.
- Recorded passing backend tests, Ruff checks, frontend production build, and Playwright coin/category coverage.
- Added and verified category-management and coin-category assignment workflows.
- Removed spreadsheet import from the current next-step plan; collection metadata is to be entered manually.

### 2026-09-14

- Updated the Phase 4 record to match the implemented coin entry, browser, editing, archive/restore, dictionary, and image workflows.
- Recorded Playwright UI verification with 5 passing coin scenarios.
- Recorded manual verification of a cross-era `476 BC → 1 AD` coin range.
- Recorded the accepted image-storage convention and its implementation.
- Added Playwright as a frontend development/test dependency.
- Removed invalid frontend validation that compared numeric years without considering their eras.
