# Coin Catalog

Personal web application for managing and browsing a collection of coins.

The project is developed incrementally, with the repository documentation serving as the persistent technical context and source of truth for the current implementation state.

## Project Status

**Current phase:** Phase 4 is complete; the next development step has not yet been started.

The application now provides a usable first catalogue workflow: coin creation, coin browsing, coin details, editing, soft archive/restore, dictionary management, and coin photograph management. The backend also contains category structures and APIs; user-facing category management is not yet implemented in the frontend.

Phase 4 is complete. Automated and manual verification has been completed. The previously planned spreadsheet-import phase is no longer the next development step because collection data will be entered manually through the application. Later planned areas include search/filtering, collection features, backup/export, testing/quality expansion, and deployment.

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
- Grid and List views,
- coin detail views,
- coin creation and editing,
- soft archive and restore,
- dictionary management,
- primary and additional coin photographs.

The backend provides the corresponding FastAPI endpoints, including category management and coin-category relationships, and persists structured catalogue data in SQLite. Coin photographs are stored as external JPG files with metadata in SQLite rather than as database BLOBs.

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
