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

### Context

The project should be developed incrementally, with the project owner retaining control over architectural and product decisions.

### Decision

Development will proceed in small, explicit steps.

Significant architectural decisions require discussion and approval before implementation.

The repository documentation will be maintained as part of development.

### Rationale

This reduces unnecessary complexity and prevents architectural decisions from being made implicitly during implementation.

### Consequences

- Work will be divided into small increments.
- The assistant should not silently change architecture.
- Significant decisions will be recorded in this document.

---

## D-002 — GitHub as Project Source of Truth

**Status:** Accepted  
**Date:** 2026-09-07

### Context

The project needs durable persistence of architectural decisions, progress, instructions, and development context.

### Decision

The GitHub repository is the canonical persistent source of truth for the project.

Project knowledge that must survive beyond a conversation should be stored in repository documentation.

### Rationale

Repository documentation is versioned, accessible to development tools, and independent of conversation history.

### Consequences

The following documents form the project's persistent documentation layer:

- `AGENTS.md`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/PROGRESS.md`
- `docs/ROADMAP.md`

---

## D-003 — Containerized Development Environment

**Status:** Accepted  
**Date:** 2026-09-07

### Context

The project must be straightforward to develop on both Windows 11 and macOS.

### Decision

The application development environment will use Docker and VS Code Dev Containers.

The development environment will run in a Linux-based container.

### Rationale

Containerization reduces host-platform differences and keeps project-specific development dependencies isolated from the host operating system.

### Consequences

- Project development dependencies should be installed inside the Dev Container.
- The host should require only the general development prerequisites.
- Host-specific runtime dependencies should be avoided where practical.

---

## D-004 — Python as Backend Language

**Status:** Accepted  
**Date:** 2026-09-07

### Context

The backend requires a mature ecosystem suitable for data processing, file handling, web APIs, and future image/data analysis.

### Decision

Python will be used for the backend.

### Rationale

Python provides a strong ecosystem for web APIs, data processing, spreadsheet import, image processing, and potential future extensions.

### Consequences

Python-specific project tooling will be established inside the Dev Container.

---

## D-005 — `uv` for Python Project Management

**Status:** Accepted  
**Date:** 2026-09-07

### Context

The Python environment should have reproducible dependency management without relying on host-specific Python environments.

### Decision

`uv` will be used for Python project and dependency management.

### Rationale

`uv` provides project dependency management and lockfile-based reproducibility while fitting naturally into the containerized development environment.

### Consequences

The Python project will use:

- `pyproject.toml`
- `uv.lock`

Python dependencies will be managed through `uv`.

---

## D-006 — FastAPI Backend

**Status:** Accepted  
**Date:** 2026-09-07

### Context

The application requires a backend API to connect the database, application logic, file management, and web frontend.

### Decision

FastAPI will be used as the backend web framework.

### Rationale

FastAPI provides a modern Python API framework with type-driven validation and good support for development of HTTP APIs.

### Consequences

The backend will expose application functionality through HTTP APIs.

---

## D-007 — SQLite Database

**Status:** Accepted  
**Date:** 2026-09-07

### Context

The application is initially intended for personal use and does not require a separate database server.

### Decision

SQLite will be used as the initial database engine.

### Rationale

SQLite is lightweight, portable, requires no separate database service, and is appropriate for the initial scale and deployment model.

### Consequences

The database will initially be stored as a local SQLite database file.

A future change to another database engine remains possible if project requirements justify it.

---

## D-008 — SQLAlchemy

**Status:** Accepted  
**Date:** 2026-09-07

### Context

The application needs a structured way to define and access its relational data model.

### Decision

SQLAlchemy will be used as the database abstraction/ORM layer.

### Rationale

SQLAlchemy provides a mature Python interface for relational databases and keeps application code relatively independent of the specific database engine.

### Consequences

Database models and database access will use SQLAlchemy.

---

## D-009 — Web Application UI

**Status:** Accepted  
**Date:** 2026-09-07

### Context

The application needs a graphical user interface that works consistently across Windows and macOS.

### Decision

The primary user interface will be a web application accessed through a browser on the host.

A native desktop GUI is not the current UI architecture.

### Rationale

A browser-based UI fits naturally with the containerized backend and avoids maintaining separate native GUI implementations for Windows and macOS.

### Consequences

The frontend and backend will communicate over HTTP.

The application will be usable from a mainstream web browser.

---

## D-010 — Vue 3 Frontend

**Status:** Accepted  
**Date:** 2026-09-07

### Context

The frontend should use a modern component-based framework rather than requiring the project to build its UI around raw JavaScript.

### Decision

Vue 3 will be used for the frontend.

### Rationale

Vue provides a component-based development model suitable for a progressively growing application while remaining relatively lightweight.

### Consequences

Frontend functionality will be organized primarily into Vue components.

---

## D-011 — TypeScript

**Status:** Accepted  
**Date:** 2026-09-07

### Context

The frontend is expected to grow beyond a minimal interface and will communicate with a typed backend API.

### Decision

TypeScript will be used for frontend development.

### Rationale

Static typing improves maintainability and makes larger frontend codebases easier to reason about.

### Consequences

Frontend source code will use TypeScript rather than general-purpose JavaScript wherever applicable.

---

## D-012 — Vite

**Status:** Accepted  
**Date:** 2026-09-07

### Context

The Vue frontend requires a development and build toolchain.

### Decision

Vite will be used as the frontend development and build tool.

### Rationale

Vite provides a straightforward development experience for Vue and TypeScript applications.

### Consequences

The frontend project will be structured as a Vite-based Vue application.

---

## D-013 — Coin Photographs Stored as Files

**Status:** Accepted  
**Date:** 2026-09-07

### Context

The project already has coin photographs in JPG files and may accumulate a significant number of images.

### Decision

Original coin photographs will be stored as external files rather than directly inside the SQLite database.

The database will store metadata and references to the image files.

### Rationale

Keeping large binary images outside the relational database simplifies file handling and database backup/management.

### Consequences

The application must have a defined filesystem storage strategy for coin photographs.

The exact storage layout and backup strategy will be decided separately when image management is implemented.

---

## D-014 — Existing XLS/XLSX Data as Import Source

**Status:** Accepted  
**Date:** 2026-09-07

### Context

Existing coin descriptions and metadata are stored in XLS/XLSX files.

### Decision

The application will support importing existing spreadsheet data into the application database.

The exact spreadsheet structure and import mapping will be determined during the import phase.

### Rationale

Existing collection data should be reused rather than manually re-entered.

### Consequences

Spreadsheet import will be implemented as a dedicated development phase after the initial database/application foundation exists.

---

## D-015 — Current Development Priority

**Status:** Accepted  
**Date:** 2026-09-07

### Context

Application functionality depends on having a reliable and reproducible development environment.

### Decision

Development will begin with the development environment rather than application features.

The first implementation phase is:

**Phase 1 — Development Environment**

### Rationale

A working and reproducible development environment provides the foundation for all subsequent implementation work.

### Consequences

The immediate implementation scope is limited to establishing and verifying the development environment.

---

## D-016 — Development Container Runtime Versions

**Status:** Accepted  
**Date:** 2026-09-09

### Context

The development environment must provide consistent Python and Node.js versions across the supported host platforms while keeping development dependencies out of the host system.

### Decision

The Development Container will use:

- Python **3.13.x**
- Node.js **24.x LTS**
- `uv` as the Python project and dependency manager

These tools will be provided inside the Dev Container rather than installed on the host.

### Rationale

Using defined major/minor release lines provides a stable compatibility target while allowing maintenance updates within those release lines. Keeping the toolchain inside the container preserves the cross-platform development model.

### Consequences

- The Dev Container configuration must provide Python 3.13.x and Node.js 24.x LTS.
- The project should not require Python or Node.js to be installed directly on the host.
- Exact patch versions may be updated as appropriate within the selected release lines.

---

## D-017 — Stable and Pinned Dependency Policy

**Status:** Accepted  
**Date:** 2026-09-09

### Context

The project should have a predictable and reproducible development environment in which the selected tools and packages are known to work together. Uncontrolled dependency updates can introduce incompatibilities, breaking changes, or unstable behaviour.

### Decision

Versions of installed development tools and project dependencies will be explicitly defined and pinned wherever the relevant tooling supports it.

The project will use stable, production-quality releases. Experimental and prerelease versions will not be used by default, including alpha, beta, release-candidate, nightly, or otherwise explicitly experimental releases.

Dependency updates will be deliberate and controlled rather than automatically tracking the newest available release.

### Rationale

Explicit versioning and stable releases improve reproducibility, compatibility, and long-term project stability. This is particularly important because the project is intended to be developed incrementally and maintained over an extended period.

### Consequences

- The Dev Container will use explicitly selected versions of its installed development tools.
- Python project dependencies will be locked through `uv.lock`.
- Frontend dependencies will use the appropriate lockfile mechanism when the frontend project is created.
- New dependencies must be evaluated for stability and compatibility before adoption.
- Upgrading a significant dependency is a deliberate maintenance change and should be tested before acceptance.
- The project will not adopt prerelease or experimental dependencies merely to obtain newer features.
