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

The Vue frontend source will be under:

```text
frontend/src/
```

Python project commands are run from `backend/`; frontend project commands are run from `frontend/`. The repository root remains the shared workspace for documentation, development configuration, Git metadata, and other repository-level files.

### Rationale

Separate source trees prevent Python and frontend `src/` directories from being mixed and make the boundaries between the two applications explicit.

### Consequences

- The backend project metadata lives under `backend/`.
- The frontend project will be created under `frontend/`.
- The physical project layout is part of the current architecture and should be reflected consistently in project documentation.
