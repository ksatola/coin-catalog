# Coin Catalog — Development Progress

This document records the actual current state of the project.

A task is marked complete only after it has been implemented and verified where verification is applicable.

---

## Current Phase

**Phase 4 — Coin Entry and Browser**

Phase 1 — Development Environment, Phase 2 — Application Skeleton, and Phase 3 — Database Foundation have been completed and verified. Phase 4 implements the first usable user-facing coin workflow: coin entry, SQLite persistence, coin browsing, coin details, editing, and archiving.

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

**Status:** Complete

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
- [x] `docs/GIT_WORKFLOW.md` established as the practical Git branching and merge workflow documentation.
- [x] Host development software requirements documented: GitHub Desktop, VS Code, Docker Desktop.
- [x] Docker Desktop host configuration verified through successful Dev Container build and startup.
- [x] VS Code / Dev Containers configuration verified through successful container connection and development workflow.
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
- [x] Initial frontend checkpoint committed and pushed to GitHub.
- [x] Detailed frontend development instructions added to `docs/DEVELOPMENT.md`.
- [x] Basic process/network diagnostic tools added to the Dev Container: `procps`, `iproute2`, and `psmisc`.

---

## Phase 2 — Application Skeleton

**Status:** Complete

### Completed and verified

- [x] Minimal backend application structure established under `backend/src/coin_catalog/`.
- [x] FastAPI application created in `backend/src/coin_catalog/main.py`.
- [x] Initial `GET /health` endpoint implemented.
- [x] FastAPI standard dependencies installed with `uv` so the FastAPI development CLI is available.
- [x] FastAPI application import verified successfully.
- [x] FastAPI development server verified successfully on port `8000`.
- [x] Direct backend request to `http://localhost:8000/health` verified successfully with `{"status":"ok"}`.
- [x] Vite development proxy configured for `/api` requests to the FastAPI server.
- [x] Vite development server verified successfully on port `5173` while the backend was running on port `8000`.
- [x] Vite proxy request to `http://localhost:5173/api/health` verified successfully with `{"status":"ok"}`.
- [x] Vue frontend calls `/api/health` and displays the returned backend status.
- [x] Frontend-to-backend health flow verified in the host browser; the application displayed `Backend status: ok`.
- [x] Basic application configuration reviewed; no additional configuration infrastructure was required at this stage.
- [x] Broader end-to-end environment verification completed successfully with both development servers running and the host browser displaying the backend status.
- [x] Frontend health-status change committed and pushed to GitHub.

---

## Phase 3 — Database Foundation

**Status:** Complete

### Completed

- [x] Stable `main` and phase-based working-branch strategy accepted and recorded as D-023.
- [x] `phase-3-database-foundation` branch created and published to `origin`.
- [x] Practical Git branching and merge workflow documented in `docs/GIT_WORKFLOW.md`.
- [x] Branching instructions added to `AGENTS.md` and `docs/DEVELOPMENT.md`.
- [x] Phase 3 working branch synchronized with the latest stable `main` and pushed to `origin`.
- [x] Phase 3 documentation review completed; no architecture change was required before database design.
- [x] SQLite database location established as `/workspaces/coin-catalog/data/coin-catalog.db`.
- [x] SQLAlchemy database engine and session configuration established.
- [x] Database session test added and verified.
- [x] Alembic selected and initialized for database schema migrations.
- [x] Alembic configured to use the application's canonical `DATABASE_URL`.
- [x] Alembic database connection verified with `uv run alembic current`.
- [x] Initial coin/reference database schema designed and accepted.
- [x] SQLAlchemy models implemented for `coin`, `country`, `issuer`, `denomination`, `mint`, `material`, `state`, and `era`.
- [x] `currency` explicitly excluded from the initial schema.
- [x] Initial Alembic migration generated as revision `e6df2f7c0c11`.
- [x] Initial Alembic migration reviewed against the accepted schema.
- [x] Initial Alembic migration applied successfully with `uv run alembic upgrade head`.
- [x] Alembic current revision verified as `e6df2f7c0c11 (head)`.
- [x] Ruff linting and formatting checks pass for the backend after model cleanup.
- [x] Focused database behavior tests added and verified.

---

## Phase 4 — Coin Entry and Browser

**Status:** In progress

### Backend

- [x] Initial coin creation API implemented.
- [x] Coin list API implemented.
- [x] Coin detail API implemented.
- [x] Coin update API implemented.
- [x] Coin archive API implemented.
- [x] Coin restore API implemented.
- [x] Active coin list excludes archived coins.
- [x] Archived coin list returns archived coins only.
- [x] Soft-delete behavior implemented with `is_deleted`; permanent coin DELETE is not used.
- [x] Dictionary list API implemented for all seven reference dictionaries.
- [x] Dictionary create API implemented for all seven reference dictionaries.
- [x] Dictionary update API implemented for all seven reference dictionaries.
- [x] Dictionary delete API implemented for all seven reference dictionaries.
- [x] Dictionary deletion is blocked with HTTP 409 when the item is referenced by a coin.
- [x] Era deletion protection covers both `from_era_id` and `to_era_id`.
- [x] Backend CRUD and archive/restore behavior verified with pytest; the latest verified result was 29 passing tests.

### Frontend

- [x] Dictionary editor UI implemented for all seven dictionaries.
- [x] Dictionary editor supports add, edit, and delete operations.
- [x] Dictionary-backed selectors implemented in the coin form.
- [x] Basic coin-form validation implemented.
- [x] User-facing coin creation flow implemented.
- [x] Coin browser implemented with Grid and List layouts.
- [x] Grid/List is a view toggle inside the coin browser rather than separate routes.
- [x] Grid tile navigation to coin details implemented.
- [x] List rows are not clickable; actions are explicit buttons.
- [x] Active coin actions use `Szczegóły` and `Archiwizuj`.
- [x] Archived coin actions use `Szczegóły` and `Przywróć`.
- [x] Active coin details provide `Edytuj` and `Archiwizuj`.
- [x] Archived coin details provide `Przywróć`.
- [x] Dedicated routes implemented for coins, coin details, editing, creation, archive, and dictionaries.
- [x] Fixed bottom navigation implemented for `Monety`, `Dodaj monetę`, `Archiwum`, and `Słowniki`.
- [x] Vue Router dependency added and integrated.
- [x] Vite polling enabled to ensure source changes are reflected in the Dev Container.
- [x] Host-browser verification completed for the current application; the coin data is visible in the browser when both servers are running.

### Development workflow

- [x] `start` helper script implemented for backend/frontend startup.
- [x] `stop` helper script implemented for managed process-group shutdown.
- [x] `restart` kept intentionally as `stop` → `start` without separate service-management logic.
- [x] `status` helper script added for more detailed process/port diagnostics.
- [x] Development helper-script documentation added in `docs/DEV_SCRIPTS.md`.

### Remaining Phase 4 work

- [ ] Perform final Phase 4 verification after the latest frontend/router and development-script changes:
  - [ ] `cd backend && uv run pytest`
  - [ ] `cd backend && uv run ruff check .`
  - [ ] `cd backend && uv run ruff format --check .`
  - [ ] `cd frontend && npm run build`
  - [ ] Manual browser walkthrough of the main coin workflow.
- [ ] Update the verified status of Phase 4 after the final verification pass.
- [ ] Decide whether any small cleanup is required before closing Phase 4.

Image management, spreadsheet import, search/filtering, collections/tags, and other advanced functionality remain outside the current Phase 4 scope.

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

**Perform the final Phase 4 verification pass, then close Phase 4 and begin the image-management design.**

Before each major phase, review `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, and `docs/ROADMAP.md` and stop for discussion if the review identifies a direction or architecture change.

---

## Change Log

### 2026-09-14

- Added basic process and network diagnostic utilities to the Dev Container: `procps`, `iproute2`, and `psmisc`.
- Added and documented the `./status` development diagnostic script.
- Kept `./restart` as a pure `./stop` followed by `./start` orchestration script.
- Improved `./start` and `./stop` output with compact service status information and clearer terminal formatting.
- Normalized development helper-script file endings.
- Verified Vite dependency optimization and startup after adding Vue Router; frontend now starts successfully on port `5173`.
- Verified FastAPI and frontend development servers can run together and the current coin data is visible in the host browser.
- Updated this progress record to reflect the implemented Phase 4 application flow and the remaining final verification step.

- Finalized the initial database schema and explicitly removed `currency` from the initial design.
- Accepted `NUMERIC` storage for weight (grams) and diameter (millimetres), with units fixed by convention rather than stored in separate columns.
- Accepted a boolean `has_video` flag without direct video URLs at this stage.
- Accepted a single optional `source` text field.
- Accepted required UTC `created_at` and `updated_at` timestamps.
- Accepted unique, non-null names for all initial reference tables.
- Implemented the SQLAlchemy models for the initial schema.
- Generated and reviewed Alembic revision `e6df2f7c0c11`.
- Applied the initial migration successfully and verified it as the current Alembic head.
- Added focused database behavior tests using an isolated in-memory SQLite database.
- Verified Ruff and pytest after test cleanup.
- Closed Phase 3 Database Foundation and defined Phase 4 as the first simple user-facing coin entry and browser flow.
- Updated the roadmap to reflect the completed database foundation and the new Phase 4 scope.
- Implemented CRUD operations for all seven reference dictionaries.
- Implemented safe hard deletion of dictionary entries, blocked with HTTP 409 when an entry is referenced by a coin.
- Added dictionary editor UI with add, edit, and delete actions.
- Added tests covering dictionary CRUD and reference-protected deletion.
- Diagnosed a Dev Container/Vite file-watching issue and enabled Vite polling to ensure source changes are reflected in the development UI.
- Added the accepted soft-delete decision for coins.

### 2026-09-11

- Established the SQLite database location at `/workspaces/coin-catalog/data/coin-catalog.db`.
- Established SQLAlchemy engine and session configuration and verified the database session test.
- Added and initialized Alembic for database schema migrations.
- Configured Alembic to use the application's canonical `DATABASE_URL`.
- Verified `uv run alembic current` can connect to the SQLite database.
- Verified backend Ruff linting and formatting checks pass.
- Verified the backend pytest suite passes.
- Updated the Phase 3 documentation to reflect the verified database-foundation state.

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
- Expanded `docs/DEVELOPMENT.md` with step-by-step frontend setup, verification, and browser-access instructions.
- Reviewed `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, and `docs/ROADMAP.md` before transitioning toward Phase 2.
- Marked Phase 1 complete and began Phase 2 preparation.
- Confirmed Docker Desktop host configuration and VS Code / Dev Containers configuration as verified through the successful Dev Container build, connection, and development workflow.
- Recorded approved Phase 2 decisions for the Vite API proxy, separate development servers, and minimal backend application structure.
- Added the minimal FastAPI application and `GET /health` endpoint.
- Added FastAPI dependencies with `uv`; verified the FastAPI CLI and development server.
- Verified `GET /health` directly with `curl` and received `{"status":"ok"}`.
- Configured the Vite development proxy for `/api` requests to the FastAPI backend.
- Verified the Vite proxy end-to-end with `curl http://localhost:5173/api/health`, receiving `{"status":"ok"}`.
- Updated the Vue frontend to call `/api/health` and display the backend status.
- Verified the frontend-to-backend health flow in the host browser; the page displayed `Backend status: ok`.
- Reviewed basic application configuration and decided not to introduce configuration infrastructure at this stage.
- Performed broader end-to-end environment verification successfully with FastAPI and Vite running together and the host browser displaying the backend health status.
- Accepted D-023 establishing stable `main` and phase-based working branches.
- Created and published `phase-3-database-foundation`.
- Added `docs/GIT_WORKFLOW.md` and updated `AGENTS.md` and `docs/DEVELOPMENT.md` with the branching workflow.
- Synchronized the Phase 3 branch with the latest stable `main` and pushed the merge to `origin`.
- Reviewed the Phase 3 documentation set and confirmed no architecture change was required before database design.

### 2026-09-07

- Established the initial project architecture.
- Established the repository documentation strategy.
- Added `AGENTS.md`.
- Added `docs/DECISIONS.md`.
- Added `docs/ARCHITECTURE.md`.
- Began Phase 1 — Development Environment.
