# Coin Catalog — Development Progress

This document records the actual current state of the project.

A task is marked complete only after it has been implemented and verified where verification is applicable.

---

## Current Phase

**Phase 1 — Development Environment**

The project is currently establishing a reproducible development environment.

---

## Phase 0 — Architecture and Planning

### Completed

- [x] Project requirements discussed.
- [x] Incremental development approach established.
- [x] Docker Dev Container selected.
- [x] Python selected for the backend.
- [x] `uv` selected for Python project and dependency management.
- [x] FastAPI selected.
- [x] SQLite selected.
- [x] SQLAlchemy selected.
- [x] Web application selected as the UI architecture.
- [x] Vue 3 selected.
- [x] TypeScript selected.
- [x] Vite selected.
- [x] Windows 11 and macOS established as target host platforms.
- [x] GitHub established as the project's persistent source of truth.
- [x] Repository documentation/persistence strategy established.

---

## Phase 1 — Development Environment

### Completed

- [x] GitHub repository exists.
- [x] GitHub repository access for project development established.
- [x] `AGENTS.md` created.
- [x] `docs/DECISIONS.md` created.
- [x] `docs/ARCHITECTURE.md` created.

### Pending

- [ ] Confirm required host software and versions.
- [ ] Configure Docker.
- [ ] Configure VS Code / Dev Containers.
- [ ] Select the Python minor version.
- [ ] Configure Python and `uv` inside the Dev Container.
- [ ] Select/configure Node.js version.
- [ ] Configure Vue 3 / TypeScript / Vite inside the Dev Container.
- [ ] Define the initial project directory structure.
- [ ] Build the development container.
- [ ] Verify Python tooling inside the container.
- [ ] Verify frontend tooling inside the container.
- [ ] Verify browser access to the development application.
- [ ] Create the initial runnable application skeleton.
- [ ] Perform an end-to-end development-environment verification.
- [ ] Update README with verified setup instructions.
- [ ] Create the first development checkpoint/commit for the completed environment.

---

## Phase 2 — Application Skeleton

**Status:** Not started

Planned work:

- [ ] Establish backend application structure.
- [ ] Establish frontend application structure.
- [ ] Establish frontend/backend development workflow.
- [ ] Add initial health/status endpoint.
- [ ] Verify frontend-to-backend communication.
- [ ] Establish basic application configuration.

---

## Phase 3 — Database Foundation

**Status:** Not started

Planned work:

- [ ] Establish SQLite database location.
- [ ] Establish SQLAlchemy configuration.
- [ ] Establish database session handling.
- [ ] Establish migration strategy.
- [ ] Create initial database schema.
- [ ] Add database tests.

---

## Phase 4 — Coin Data Model

**Status:** Not started

Planned work:

- [ ] Define the initial coin data model.
- [ ] Define required and optional fields.
- [ ] Define identifiers.
- [ ] Define relationships required by the initial catalogue.
- [ ] Implement database models.
- [ ] Add model/database tests.

---

## Phase 5 — Spreadsheet Import

**Status:** Not started

Planned work:

- [ ] Inspect existing XLS/XLSX structure.
- [ ] Define source-to-model mappings.
- [ ] Define validation rules.
- [ ] Define duplicate handling.
- [ ] Implement import.
- [ ] Implement import error reporting.
- [ ] Test import using representative data.

---

## Phase 6 — Image Management

**Status:** Not started

Planned work:

- [ ] Define image storage layout.
- [ ] Define image naming/reference strategy.
- [ ] Implement image association with coins.
- [ ] Implement image serving/access.
- [ ] Evaluate thumbnail generation.
- [ ] Test image management.

---

## Phase 7 — Coin Browser

**Status:** Not started

Planned work:

- [ ] Create coin list/gallery.
- [ ] Display coin photographs.
- [ ] Display basic coin metadata.
- [ ] Implement coin detail view.
- [ ] Implement pagination or another appropriate large-list strategy.

---

## Phase 8 — Search and Filtering

**Status:** Not started

Planned work:

- [ ] Define searchable fields.
- [ ] Implement basic search.
- [ ] Implement filtering.
- [ ] Evaluate sorting.
- [ ] Optimize queries if required.

---

## Phase 9 — Collections, Categories and Tags

**Status:** Not started

Planned work:

- [ ] Define collection concept.
- [ ] Define category concept.
- [ ] Define tag concept.
- [ ] Implement relationships.
- [ ] Implement management UI.
- [ ] Add filtering by collection/category/tag.

---

## Phase 10 — Editing

**Status:** Not started

Planned work:

- [ ] Edit coin metadata.
- [ ] Edit collection/category/tag information.
- [ ] Manage coin photographs.
- [ ] Add validation and user feedback.

---

## Phase 11 — Backup and Export

**Status:** Not started

Planned work:

- [ ] Define backup strategy.
- [ ] Define database backup process.
- [ ] Define image backup process.
- [ ] Evaluate metadata export.
- [ ] Evaluate full catalogue export.

---

## Phase 12 — Testing and Quality

**Status:** Not started

Planned work:

- [ ] Establish broader automated test coverage.
- [ ] Add integration tests.
- [ ] Add frontend tests where justified.
- [ ] Add end-to-end tests where justified.
- [ ] Establish quality checks.
- [ ] Establish CI checks.

---

## Phase 13 — Packaging and Deployment

**Status:** Not started

Planned work:

- [ ] Define supported deployment model.
- [ ] Prepare production container/runtime.
- [ ] Document deployment.
- [ ] Document backup and recovery.
- [ ] Verify deployment on supported host platforms.

---

## Current Next Step

The next concrete task is:

**Establish the development environment and Dev Container.**

Before implementation, determine the required host-side software and select the Python and Node.js versions.

---

## Change Log

### 2026-09-07

- Established the initial project architecture.
- Established the repository documentation strategy.
- Added `AGENTS.md`.
- Added `docs/DECISIONS.md`.
- Added `docs/ARCHITECTURE.md`.
- Began Phase 1 — Development Environment.
