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
- [x] Separate top-level `backend/` and `frontend/` project layout established.

---

## Phase 1 — Development Environment

### Completed

- [x] GitHub repository exists.
- [x] GitHub repository access for project development established.
- [x] `AGENTS.md` created.
- [x] `docs/DECISIONS.md` created.
- [x] `docs/ARCHITECTURE.md` created.
- [x] `docs/PROGRESS.md` established as the progress record.
- [x] `docs/ROADMAP.md` established as the roadmap.
- [x] `README.md` established as the human-facing project documentation.
- [x] `docs/DEVELOPMENT.md` established as the detailed development-environment documentation.
- [x] Host development software requirements documented: GitHub Desktop, VS Code, Docker Desktop.
- [x] Dev Container build and startup verified.
- [x] Python 3.14.7 verified inside the Dev Container.
- [x] Node.js 24.20.0 verified inside the Dev Container.
- [x] `uv` 0.12.10 verified inside the Dev Container.
- [x] Dev Container repository workspace path `/workspaces/coin-catalog` verified.
- [x] Entire Git repository verified as visible inside the Dev Container workspace.
- [x] Python project initialized with `uv init --python 3.14`.
- [x] Python project reorganized under `backend/` in the repository.
- [x] `backend/.python-version` created and verified as `3.14` in the committed project structure.
- [x] `backend/pyproject.toml` established for the Python backend project.
- [x] Initial `backend/src/coin_catalog/__init__.py` retained as the generated Python package scaffold.
- [x] Reorganized `backend/` project verified inside the user's local Dev Container.
- [x] `coin_catalog` backend package import verified successfully with `uv run python -c "import coin_catalog; print('backend import OK')"`.
- [x] Vue 3 + TypeScript + Vite frontend project created under `frontend/`.
- [x] Frontend scaffold created as a blank Vue project without example application code.
- [x] Frontend dependencies installed successfully with `npm install`.
- [x] Frontend dependency installation audited 152 packages and reported 0 vulnerabilities.
- [x] Frontend production build verified successfully with `npm run build`.
- [x] Vite development server verified successfully with `npm run dev -- --host 0.0.0.0`.
- [x] Host-browser access to `http://localhost:5173/` verified successfully.
- [x] Initial frontend checkpoint committed and pushed to GitHub by the user.
- [x] Detailed frontend development instructions added to `docs/DEVELOPMENT.md`.

### Pending

- [ ] Verify Docker Desktop host configuration on the development machine.
- [ ] Verify VS Code / Dev Containers extension configuration on the development machine.
- [ ] Create the initial runnable application skeleton.
- [ ] Perform an end-to-end development-environment verification.

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

**Review the completed Phase 1 environment and prepare the transition to Phase 2 — Application Skeleton.**

Before each major phase, review `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, and `docs/ROADMAP.md` and stop for discussion if the review identifies a direction or architecture change.

---

## Change Log

### 2026-09-09

- Built and started the Dev Container successfully.
- Verified Python 3.14.7 inside the container.
- Verified Node.js 24.20.0 inside the container.
- Verified `uv` 0.12.10 inside the container.
- Corrected the Dev Container workspace path from `/workspace` to `/workspaces/coin-catalog`.
- Verified `/workspaces/coin-catalog` as the container workspace directory.
- Verified the entire Git repository is visible inside the Dev Container workspace.
- Documented detailed development environment instructions in `docs/DEVELOPMENT.md`.
- Initialized the Python project with `uv init --python 3.14`.
- Reorganized the Python project under `backend/` to keep backend and frontend source trees separate.
- Updated project documentation to reflect the separate backend/frontend source-tree decision.
- Rebuilt/reopened the user's local Dev Container after the repository reorganization and verified the reorganized backend project.
- Verified the `coin_catalog` backend package imports successfully with `uv run python -c "import coin_catalog; print('backend import OK')"`.
- Created the Vue 3 + TypeScript + Vite frontend project under `frontend/`.
- Selected the blank Vue project option and declined optional Router, Pinia, testing, linting, formatting, JSX, and other extras during initial scaffolding.
- Installed frontend dependencies with `npm install`; 152 packages were audited and 0 vulnerabilities were reported.
- Verified the frontend production build with `npm run build`; Vite 8.2.2 completed the build successfully.
- Started Vite with `npm run dev -- --host 0.0.0.0` and verified the development server on port 5173.
- Verified host-browser access to `http://localhost:5173/`.
- User committed and pushed the initial frontend checkpoint to GitHub.
- Expanded `docs/DEVELOPMENT.md` with step-by-step frontend setup, verification, and browser-access instructions.

### 2026-09-07

- Established the initial project architecture.
- Established the repository documentation strategy.
- Added `AGENTS.md`.
- Added `docs/DECISIONS.md`.
- Added `docs/ARCHITECTURE.md`.
- Began Phase 1 — Development Environment.
