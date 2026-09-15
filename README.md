# Coin Catalog

Personal web application for managing and browsing a collection of coins.

The project is developed incrementally, with the repository documentation serving as the persistent technical context and source of truth for the current implementation state.

## Project Status

**Current phase:** Phase 7 — Collection Number is complete and verified on the working branch.

The application provides a usable catalogue workflow including coin creation, browsing, details, editing, soft archive/restore, dictionary management, coin photograph management, category management, coin-category assignment, search and filtering, and a user-facing collection number independent from the technical database ID.

Phase 1 through Phase 6 are complete. Phase 7 — Collection Number adds the optional collection-number field across the database, API, forms, search, and catalogue presentation, with backend and Playwright coverage. Collection metadata continues to be entered manually through the application; XLS/XLSX import is not part of the current workflow.

## Architecture

The current stack is:

- **Development environment:** Docker + VS Code Dev Containers
- **Backend:** Python + FastAPI
- **Python project management:** `uv`
- **Database:** SQLite + SQLAlchemy + Alembic
- **Frontend:** Vue 3 + TypeScript + Vite + Vue Router
- **End-to-end UI tests:** Playwright
- **Source control:** Git + GitHub

The application runs inside the development container and is accessed through a browser on the host system.

The primary host platforms are Windows 11 and macOS.

## Current Application

The frontend provides:

- active and archived coin browsers,
- Gallery, Grid, and List views,
- coin detail views,
- coin creation and editing,
- optional collection-number entry and display,
- soft archive and restore,
- dictionary management,
- primary and additional coin photographs,
- category management,
- category parent/child relationship management,
- coin-category assignment and removal,
- text search and catalogue filtering.

The backend provides the corresponding FastAPI endpoints and persists structured catalogue data in SQLite. Coin photographs are stored as external JPG files with metadata in SQLite rather than as database BLOBs.

Each coin has a technical database ID. An optional collection number is stored separately as user-facing text and is not used as a replacement for the technical ID.

Coin dates are represented by a year together with an era for each endpoint. The application does not compare the numeric year values across eras, so ranges such as `476 BC → 1 AD` are valid.

## Documentation

The repository contains the project's persistent technical and development context:

- [`AGENTS.md`](AGENTS.md) — instructions for development and AI collaboration
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — current technical architecture
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — accepted architectural decisions
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — current implementation progress
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — planned development path
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — development environment and local workflow
- [`docs/IMAGE_STORAGE_DECISION.md`](docs/IMAGE_STORAGE_DECISION.md) — accepted coin-image storage and naming rules

These documents are kept synchronized with verified implementation changes.

## Development Approach

The project is developed incrementally.

Each major development phase begins with a documentation review to verify that:

1. the current architecture is still appropriate,
2. accepted decisions are still valid,
3. actual progress matches the documented state,
4. the roadmap is still pointing in the right direction.

Significant architectural or technical changes are discussed and approved before implementation.

Development should favor small, verifiable changes over large speculative implementations.

## Data and Images

Collection metadata is entered manually through the application. XLS/XLSX import is not part of the current workflow.

Coin photographs are not committed to Git. The accepted storage convention uses a top-level `images/` directory alongside `data/`, flat six-digit coin IDs, and filenames such as:

```text
000404 - awers.jpg
000404 - rewers.jpg
000404 - 01.jpg
```

The database stores image metadata and references; image contents remain files on disk.

## Development Setup

Detailed development environment and Dev Container instructions are maintained in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

The verified Dev Container workspace is:

```text
/workspaces/coin-catalog
```
