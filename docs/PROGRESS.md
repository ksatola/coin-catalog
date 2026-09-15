# Coin Catalog — Development Progress

This document records the current, verified state of the project. A task is marked complete only after it has been implemented and verified where verification is applicable.

---

## Current Phase

**Phase 5 — Search and Filtering is complete.**

**Phase 6 — UI Foundation and Visual System is planned but has not yet been implemented.**

Phase 1 — Development Environment, Phase 2 — Application Skeleton, Phase 3 — Database Foundation, Phase 4 — Coin Entry and Browser, and Phase 5 — Search and Filtering are complete. Phase 5 adds user-facing search and filtering to the catalogue, including recursive category filtering and sorting.

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
- [x] Category management and coin-category backend APIs.
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
- [x] Category management UI.
- [x] Multiple parent/child category relationships and relation removal.
- [x] Category cycle-error handling and deletion protection UI.
- [x] Coin-category assignment and removal UI.

### Automated UI verification

The verified Playwright coverage passes:

```text
5 coin/image scenarios
15 category and coin-category scenarios
```

The coin/image suite covers:

- awers replacement;
- cancelling an awers replacement;
- rewers replacement;
- additional image upload;
- cross-era date range such as `476 BC → 1 AD`.

The category suite covers category CRUD, multiple parent/child relations, relation removal, cycle prevention behavior, deletion protection, and coin-category assignment/removal.

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

## Phase 5 — Search and Filtering

**Status:** Complete

### Backend

- [x] Dedicated coin-query builder for search, filtering, status, and sorting.
- [x] Tokenized text search with normalized whitespace.
- [x] Text-search tokens are combined with AND semantics and are independent of word order.
- [x] Search covers country, issuer, denomination, mint, material, state, era, description, source, year endpoints, and category names.
- [x] Dictionary filters for the supported coin reference fields.
- [x] Era filtering.
- [x] Year-range overlap filtering.
- [x] Image and video presence filters.
- [x] Active, archived, and all status filtering.
- [x] Category filtering with optional recursive inclusion of subcategories.
- [x] Multiple selected categories use OR semantics within the category filter.
- [x] Different filter types combine with AND semantics.
- [x] Sorting by coin ID and year endpoints in ascending or descending order.
- [x] Stable sorting with coin ID as a tie-breaker.
- [x] Defensive distinct handling to prevent duplicate coins in query results.

### Frontend

- [x] User-facing `Wyszukiwanie i filtrowanie monet` workflow.
- [x] Search input with minimum three-character validation per search token.
- [x] Dictionary filter controls.
- [x] Era, year, image, video, and status filters.
- [x] Category filter with `Uwzględniaj podkategorie` enabled by default.
- [x] Direct-category filtering when subcategory inclusion is disabled.
- [x] Sort controls.
- [x] Filter reset behavior.

### Automated verification

Verified:

- backend pytest suite passes;
- Ruff lint passes;
- Ruff format check passes;
- frontend production build passes;
- all Playwright UI tests pass.

Playwright runs with both the frontend development server and FastAPI backend available, so the verified browser run does not depend on an unavailable backend proxy target.

Phase 5 is therefore complete.

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
- acyclic category graph validation in the backend;
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

## Search and Filtering — Historical Summary

The Phase 5 implementation is recorded above. Search and filtering are now part of the verified catalogue workflow.

Broader collection/tag organization and related filtering remain future work.

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

Backend pytest and Ruff checks and Playwright UI coverage are established. Phase 5 search/filtering verification is complete. Broader integration tests, CI checks, and further quality automation remain future work.

---

## Packaging and Deployment

**Status:** Not started

Production runtime, deployment, backup/recovery documentation, and supported-host verification remain future work.

---

## Current Next Step

Phase 6 — UI Foundation and Visual System is the next approved implementation phase. Implementation has not yet started.

Before each major phase, review `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, and `docs/ROADMAP.md`. Stop for discussion if the review identifies a direction or architecture change.

---

## Change Log

### 2026-09-15 — Phase 6 Roadmap Change

- Approved Phase 6 as UI Foundation and Visual System.
- Replaced the original Phase 6 image-management focus with UI foundation and visual-system work.
- Kept further image-management extensions as optional future work.
- Recorded that Phase 6 implementation has not yet started.

### 2026-09-15

- Completed and verified Phase 5 — Search and Filtering.
- Recorded the implemented search, filtering, recursive category filtering, and sorting behavior.
- Recorded passing backend pytest, Ruff lint, Ruff format, frontend production build, and Playwright verification.
- Updated the current phase from Phase 4 to Phase 5.
- Synchronized the progress record with the verified Phase 5 implementation.

### 2026-09-15 — Phase 4

- Closed Phase 4 after the final local verification pass.
- Recorded passing backend tests, Ruff checks, frontend production build, and the 5-scenario Playwright coin suite.
- Recorded the clean final working tree.
- Added and verified the user-facing category-management and coin-category assignment workflows.
- Updated category UI verification to 15 passing scenarios.
- Synchronized documentation with the verified Phase 4 implementation.
- Removed spreadsheet import from the current next-step plan; collection metadata is to be entered manually.

### 2026-09-14

- Updated the Phase 4 record to match the implemented coin entry, browser, editing, archive/restore, dictionary, and image workflows.
- Recorded Playwright UI verification with 5 passing coin scenarios.
- Recorded manual verification of a cross-era `476 BC → 1 AD` coin range.
- Recorded the accepted image-storage convention and its current implementation.
- Updated the roadmap relationship between Phase 4 and the originally planned image/browser/editing phases.
- Added Playwright as a frontend development/test dependency.
- Removed the invalid frontend validation that compared numeric years without considering their eras.
