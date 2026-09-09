# Architecture & Project Decisions

This document records accepted decisions that materially affect the Coin Catalog project.

A proposal is not a decision until explicitly accepted by the project owner.

## Decision Statuses

- **Accepted** — currently valid decision.
- **Superseded** — replaced by a later decision.
- **Rejected** — explicitly considered and rejected.
- **Deprecated** — no longer relevant to the project.

---

## D-001 — Project Development Model

**Status:** Accepted  
**Date:** 2026-09-07

Development proceeds in small, explicit steps. Significant architectural decisions require discussion and approval before implementation, and repository documentation is maintained as part of development.

---

## D-002 — GitHub as Project Source of Truth

**Status:** Accepted  
**Date:** 2026-09-07

The GitHub repository is the canonical persistent source of truth. Project knowledge that must survive beyond a conversation is stored in repository documentation.

---

## D-003 — Containerized Development Environment

**Status:** Accepted  
**Date:** 2026-09-07

Development uses Docker and VS Code Dev Containers with a Linux-based container. Project-specific development dependencies belong inside the container; host-specific runtime dependencies should be avoided where practical.

---

## D-004 — Python as Backend Language

**Status:** Accepted  
**Date:** 2026-09-07

Python is the backend language, providing the ecosystem needed for APIs, data processing, spreadsheet import, image processing, and future extensions.

---

## D-005 — `uv` for Python Project Management

**Status:** Accepted  
**Date:** 2026-09-07

`uv` is used for Python project and dependency management. The Python project uses `pyproject.toml` and `uv.lock`, with dependencies managed through `uv`.

---

## D-006 — FastAPI Backend

**Status:** Accepted  
**Date:** 2026-09-07

FastAPI is the backend web framework. The backend exposes application functionality through HTTP APIs.

---

## D-007 — SQLite Database

**Status:** Accepted  
**Date:** 2026-09-07

SQLite is the initial database engine. It is lightweight, portable, and requires no separate database service. A future database-engine change remains possible if justified by requirements.

---

## D-008 — SQLAlchemy

**Status:** Accepted  
**Date:** 2026-09-07

SQLAlchemy is the database abstraction/ORM layer. Database models and database access use SQLAlchemy.

---

## D-009 — Web Application UI

**Status:** Accepted  
**Date:** 2026-09-07

The primary UI is a web application accessed through a browser on the host. A native desktop GUI is not the current UI architecture. Frontend and backend communicate over HTTP.

---

## D-010 — Vue 3 Frontend

**Status:** Accepted  
**Date:** 2026-09-07

Vue 3 is the frontend framework. Frontend functionality is organized primarily into Vue components.

---

## D-011 — TypeScript

**Status:** Accepted  
**Date:** 2026-09-07

TypeScript is used for frontend development to improve maintainability and provide static typing for the growing frontend codebase.

---

## D-012 — Vite

**Status:** Accepted  
**Date:** 2026-09-07

Vite is the frontend development and build tool for the Vue/TypeScript application.

---

## D-013 — Coin Photographs Stored as Files

**Status:** Accepted  
**Date:** 2026-09-07

Original coin photographs are stored as external files rather than SQLite BLOBs. The database stores references and metadata. Exact storage layout and backup strategy will be decided during image management implementation.

---

## D-014 — Existing XLS/XLSX Data as Import Source

**Status:** Accepted  
**Date:** 2026-09-07

Existing XLS/XLSX data will be imported into the application database. Exact spreadsheet structure, mappings, validation, and duplicate handling will be determined during the import phase.

---

## D-015 — Current Development Priority

**Status:** Accepted  
**Date:** 2026-09-07

Development begins with the development environment rather than application features. The first implementation phase is **Phase 1 — Development Environment**.

---

## D-016 — Development Container Runtime Versions

**Status:** Accepted  
**Date:** 2026-09-09

The Dev Container uses:

- Python **3.14.7**
- Node.js **24.20.0**
- `uv` **0.12.10**

These tools are provided inside the container rather than installed on the host. Python 3.14 is selected for this new project; Python 3.13 may be reconsidered if material dependency compatibility problems are encountered.

---

## D-017 — Stable and Pinned Dependency Policy

**Status:** Accepted  
**Date:** 2026-09-09

Development tools and project dependencies use explicitly selected and pinned versions wherever supported. Stable production-quality releases are preferred; prerelease and experimental releases are not used by default. Dependency upgrades are deliberate and tested changes.

---

## D-018 — Verified State / Fact-Based Development

**Status:** Accepted  
**Date:** 2026-09-09

Current project state, completed work, configuration, and test results must be based on facts and verified whenever possible. Assumptions and plans must not be presented as facts. Failures, incomplete work, and unverifiable states must be stated clearly. `docs/PROGRESS.md` records only verified current state.

---

## D-019 — Separate Backend and Frontend Source Trees

**Status:** Accepted  
**Date:** 2026-09-09

The repository uses separate top-level `backend/` and `frontend/` project directories.

The Python backend source is under:

```text
backend/src/coin_catalog/
```

The Vue frontend source is under:

```text
frontend/src/
```

Python project commands are run from `backend/`; frontend project commands are run from `frontend/`. The repository root remains the shared workspace for documentation, development configuration, Git metadata, and other repository-level files.

### Rationale

Separate source trees prevent Python and frontend `src/` directories from being mixed and make the boundaries between the two applications explicit.

### Consequences

- The backend project metadata lives under `backend/`.
- The frontend project lives under `frontend/`.
- The physical project layout is part of the current architecture and should be reflected consistently in project documentation.

---

## D-020 — Vite Development Proxy for Backend API

**Status:** Accepted  
**Date:** 2026-09-09

During development, the Vue frontend communicates with the FastAPI backend through relative `/api/...` paths. Vite proxies these requests to the FastAPI development server on port 8000.

The frontend therefore does not directly address the backend development origin from browser JavaScript, avoiding the need for CORS configuration for the initial development workflow.

### Rationale

The proxy keeps the browser-facing development application on a single origin while allowing the frontend and backend to remain independently runnable. It reduces unnecessary configuration at the application-skeleton stage and avoids coupling frontend code to a development-specific backend URL.

### Consequences

- Vite development configuration will contain the `/api` proxy.
- Frontend API calls should use relative `/api/...` paths rather than hard-coded `http://localhost:8000` URLs.
- CORS is not required for the initial frontend-to-backend development connection.
- If a future architecture requires genuine cross-origin browser requests, CORS policy will be evaluated and configured deliberately.

---

## D-021 — Separate Frontend and Backend Development Servers

**Status:** Accepted  
**Date:** 2026-09-09

The frontend and backend run as separate development servers inside the Dev Container:

- Vue/Vite on port **5173**
- FastAPI on port **8000**

Both ports are exposed/forwarded by the Dev Container for host-browser development.

### Rationale

Keeping the servers independent preserves clear frontend/backend boundaries and allows each development toolchain to operate normally while the Vite proxy provides the browser-facing integration path.

### Consequences

- Frontend and backend can be started, stopped, and tested independently.
- The Dev Container exposes both development ports.
- The initial Phase 2 workflow requires both servers to be running for end-to-end frontend/backend verification.

---

## D-022 — Minimal Backend Application Structure

**Status:** Accepted  
**Date:** 2026-09-09

The initial FastAPI backend uses the following minimal structure:

```text
backend/
├── .python-version
├── pyproject.toml
└── src/
    └── coin_catalog/
        ├── __init__.py
        └── main.py
```

The initial `main.py` contains the FastAPI application and the first health/status endpoint. Additional modules and abstractions will be introduced only when justified by subsequent requirements.

### Rationale

The application skeleton should establish a runnable backend without prematurely introducing database, service, repository, configuration, or other structural layers that are not yet required.

### Consequences

- `main.py` is the initial FastAPI application entry point.
- The first backend functionality is a health/status endpoint.
- Database and broader application structure remain outside the initial skeleton and will be designed in their respective phases.

---

## D-023 — Stable `main` and Phase-Based Working Branches

**Status:** Accepted  
**Date:** 2026-09-09

`main` is the project's stable branch. Development and experimentation must take place on dedicated working branches and must not be committed directly to `main`.

The normal branch for a development phase uses the naming pattern:

```text
phase-N-short-description
```

For example:

```text
phase-3-database-foundation
```

Smaller independent work may use descriptive `feature/`, `fix/`, or `docs/` branches.

Working branches are developed, run, tested, and documented normally. A branch is merged into `main` only after the relevant implementation, tests, documentation, and verification are complete, preferably through a pull request.

The project does not use a permanent `develop` branch.

### Rationale

This provides a simple separation between stable project state and work in progress without introducing the additional complexity of a long-lived integration branch. The existing Docker/Dev Container workflow is independent of Git branch choice, so the application can be developed and run normally from a working branch.

### Consequences

- `main` remains the stable integration point.
- Incomplete phase work can remain isolated on its working branch without destabilizing `main`.
- The next phase should normally be branched from the latest stable `main`.
- Working branches can contain multiple small logical commits.
- Pull requests provide a natural final review and verification point before merging.
- A more complex release or integration branching model will require a separate project decision.

---

## D-024 — Application Data Directory Inside Repository Working Tree

**Status:** Accepted  
**Date:** 2026-09-09

Persistent application data is stored in a top-level `data/` directory inside the repository working tree. The `data/` directory is ignored by Git and is not part of the repository's versioned source or documentation.

The initial SQLite database is:

```text
/workspaces/coin-catalog/data/coin-catalog.db
```

### Rationale

Keeping application data under the Dev Container workspace simplifies the development environment and avoids a separate persistent `/data` mount. Git provides the source-control boundary, while `.gitignore` ensures runtime data is not committed.

### Consequences

- The database and future local application data can use a simple repository-relative `data/` path.
- Git will not track files under `data/`.
- Branch changes do not alter the local database because the database is not version-controlled.
- Backup and portability of application data remain separate concerns and will be addressed later.

---

## D-025 — Project Coding Standards

**Status:** Accepted  
**Date:** 2026-09-09

The project follows the coding conventions documented in [`docs/CODING_STANDARDS.md`](CODING_STANDARDS.md).

The standard establishes a deliberately small professional baseline, including:

- PEP 8 and modern Python conventions,
- Ruff for Python formatting and linting,
- type hints and Pyright for static type checking,
- Google-style docstrings for public Python code where useful,
- pytest for Python testing,
- Vue 3 and TypeScript conventions for frontend code,
- explicit error-handling and security practices,
- focused commits and synchronized documentation.

Tools are introduced and configured when the corresponding development step requires them; listing a tool in the standard does not imply that it has already been installed or configured.

### Rationale

A concise, explicit coding standard provides consistent professional practices without adding unnecessary tooling or process. Keeping detailed standards in a dedicated document prevents `AGENTS.md` and `docs/DEVELOPMENT.md` from becoming overloaded with style rules.

### Consequences

- Contributors and AI agents should follow `docs/CODING_STANDARDS.md`.
- Changes to coding conventions should be made deliberately and reflected in that document.
- New tooling should still be justified and introduced incrementally.
