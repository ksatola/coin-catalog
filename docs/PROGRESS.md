# Coin Catalog — Development Progress

This document records the current, verified state of the project. A task is marked complete only after it has been implemented and verified where verification is applicable.

---

## Current Phase

**Phase 8 — Collections is in progress on the working branch.**

Phase 7 — Collection Number is complete and verified.

Phase 1 — Development Environment, Phase 2 — Application Skeleton, Phase 3 — Database Foundation, Phase 4 — Coin Entry and Browser, Phase 5 — Search and Filtering, and Phase 6 — UI Foundation and Visual System are complete.

---

## Phase 1 — Development Environment

**Status:** Complete

Verified: Docker Dev Container and VS Code / Dev Containers workflow; Python 3.14.7, Node.js 24.20.0, and uv 0.12.10; separate backend/frontend projects; Vue 3 + TypeScript + Vite; backend Python project with uv; host-browser access to Vite; and development helper scripts.

---

## Phase 2 — Application Skeleton

**Status:** Complete

Verified: FastAPI application and `GET /health`; separate backend/frontend development servers; Vite `/api` proxy; and end-to-end browser health flow.

---

## Phase 3 — Database Foundation

**Status:** Complete

Verified: SQLite, SQLAlchemy, Alembic, initial coin/reference schema, database behavior tests, Ruff lint/format, year + era date representation, and exclusion of `currency` from the initial schema.

---

## Phase 4 — Coin Entry and Browser

**Status:** Complete

Implemented and verified: coin create/list/detail/update/archive/restore; soft deletion; seven reference dictionaries; dictionary-backed forms; Grid/List browser and navigation; fixed bottom navigation; primary and additional image workflows; accepted external-file image storage; category management and parent/child relations; cycle prevention and deletion protection; coin-category assignment/removal; and cross-era date ranges.

Verified UI coverage included coin/image and category scenarios. Backend tests, Ruff checks, frontend production build, manual cross-era entry, and the final working-tree state were verified at phase completion.

---

## Phase 5 — Search and Filtering

**Status:** Complete

Implemented and verified: tokenized order-independent AND text search; search across coin, reference, description, source, era, year, and category data; dictionary/era/year/media/status/category filters; recursive category filtering; OR semantics within filter types and AND semantics between types; deterministic sorting; duplicate-result protection; reset behavior; and Playwright coverage.

Final Phase 5 validation passed backend pytest, Ruff lint, Ruff format check, frontend production build, and the full Playwright UI suite.

---

## Phase 6 — UI Foundation and Visual System

**Status:** Complete

Implemented and verified: consistent application layout and navigation; shared visual foundation; reusable catalogue presentation; active/archive view structure; Gallery/Grid/List modes; persistent view preferences; responsive image gallery; consistent coin presentation; keyboard image viewer; redesigned coin forms; inline dictionary/category creation; redesigned category/dictionary management; updated Playwright tests; and automated image-viewer coverage.

The inline-category creation flow was corrected to use the category returned by `POST /api/categories` directly. The later Phase 7 verification covers the resulting UI state.

---

## Phase 7 — Collection Number

**Status:** Complete

Implemented and verified:

- nullable `collection_number` text field on `coin`;
- Alembic migration `9c7e1a2b4d6f`;
- API create/update/response support;
- creation and editing form support;
- display in Grid, List, and Detail views;
- inclusion in coin search;
- backend create/update/retrieval coverage;
- dedicated Playwright create/edit coverage;
- catalogue scroll-position preservation during search refreshes.

Migration verification confirmed a linear Alembic history, a passing collection-number migration test, and successful local upgrade to `9c7e1a2b4d6f`. The dedicated Collection Number Playwright suite passed with **2 tests passed**. The search scroll regression fix was manually verified.

The collection number is optional, user-facing text independent from the technical database ID, with no uniqueness rule or restrictive format.

---

## Phase 8 — Collections

**Status:** In progress

Implemented repository functionality includes collection CRUD and statistics, collection-aware coin data and filtering, collection-aware image storage, atomic coin moves with filesystem/database compensation, collection management and detail views, collection assignment during coin creation/editing, and independent collection-save behavior in coin editing.

Verified in the current development cycle:

- frontend/tests/ui/coin-edit.spec.ts — **7 tests passed** (user-reported local Playwright result);
- frontend/tests/ui/collections.spec.ts — **9 tests passed** (user-reported local Playwright result).

Additional Phase 8 work completed in the current cycle:

- collection creation now creates the required `collection-XXX` image directory before committing the collection;
- backend regression coverage verifies the collection-directory creation behavior;
- `Monety` and `Archiwum` display the active collection scope directly in the page header;
- the Collections management view provides `Pokaż` navigation to `/kolekcje/:id`;
- Playwright coverage was extended for active collection scope and collection-detail navigation.

The Phase 8 backend suite and complete project verification have not yet been reported as run in the current cycle, so Phase 8 remains **in progress** rather than complete.

## Image Management

**Status:** Initial implementation complete

The accepted D-030 storage convention is implemented: top-level Git-ignored `images/`, flat six-digit coin-ID filenames, primary awers/rewers images, sequential additional images, SQLite metadata, JPG serving, explicit replacement confirmation, and byte-preserving storage.

Further image features remain optional future work.

---

## Category Management

**Status:** Complete for the current Phase 4 scope

Verified: category entity; parent/child relations; acyclic graph validation; multiple parents/children; `/kategorie` CRUD; relation management; cycle handling; deletion protection; `coin_category`; and coin-category assignment/removal.

Broader collection/tag organization remains future work.

---

## Spreadsheet Import

**Status:** Not part of the current development plan

The application has no XLS/XLSX import implementation. Collection metadata is entered manually.

---

## Backup and Export

**Status:** Not started

Planned: database/image backup strategy and useful metadata/catalogue export.

---

## Testing and Quality

**Status:** Ongoing

Backend pytest, Ruff checks, frontend production build, and Playwright UI coverage are established. Phases 1–7 have been verified as recorded above. Broader integration tests, CI checks, and further quality automation remain future work.

---

## Packaging and Deployment

**Status:** Not started

Production runtime, deployment, backup/recovery documentation, and supported-host verification remain future work.

---

## Current Next Step

Next step: run the remaining Phase 8 verification locally and synchronize the phase documentation with the final verified results.

---

## Change Log

### 2026-09-18 — Phase 8 collection UI and filesystem update

- Recorded collection-directory creation on collection creation.
- Recorded active collection scope visibility in Monety and Archiwum.
- Recorded collection-list `Pokaż` navigation to `/kolekcje/:id`.
- Added backend and Playwright regression coverage for the new behavior.

### 2026-09-18 — Phase 8 verification update

- Recorded the user-reported Playwright result of **7 passed** for frontend/tests/ui/coin-edit.spec.ts.
- Recorded the previously verified **9 passed** result for frontend/tests/ui/collections.spec.ts.
- Kept Phase 8 marked **in progress** because the complete backend/project verification has not yet been reported as run in the current cycle.


### 2026-09-15 — Phase 7 completion

- Completed and verified Collection Number.
- Recorded migration `9c7e1a2b4d6f` and successful local upgrade.
- Recorded backend and Playwright Collection Number coverage.
- Recorded the catalogue search scroll-position fix and manual verification.

### 2026-09-15 — Phase 6 completion

- Recorded the implemented UI Foundation and Visual System work as complete.
- Recorded the inline-category creation correction.

### 2026-09-15 — Phase 6 Roadmap Change

- Approved Phase 6 as UI Foundation and Visual System.
- Replaced the original Phase 6 image-management focus with UI foundation and visual-system work.
- Kept further image-management extensions as optional future work.

### 2026-09-15 — Phase 5

- Completed and verified Phase 5 — Search and Filtering.

### 2026-09-15 — Phase 4

- Closed Phase 4 after final local verification.
- Added and verified category-management and coin-category assignment workflows.
- Removed spreadsheet import from the current next-step plan.

### 2026-09-14

- Recorded the Phase 4 coin, browser, editing, archive/restore, dictionary, image, and cross-era date workflows and their verification.
