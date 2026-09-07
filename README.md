# Coin Catalog

Personal application for managing and browsing a collection of coins.

The project is designed to provide a simple foundation that can be extended over time with features such as search, collections, image management, data import, statistics, and other numismatic functionality.

## Project Status

**Current phase:** Phase 1 — Development Environment

The project is currently focused on establishing a reproducible, cross-platform development environment before application implementation begins.

## Architecture

The current planned technology stack is:

- **Development environment:** Docker + VS Code Dev Containers
- **Backend:** Python + FastAPI
- **Python project management:** `uv`
- **Database:** SQLite + SQLAlchemy
- **Frontend:** Vue 3 + TypeScript + Vite
- **Source control:** Git + GitHub

The application is intended to run inside the development container while being accessed through a web browser on the host system.

The primary host platforms are Windows 11 and macOS.

## Documentation

The repository contains the project's persistent technical and development context:

- [`AGENTS.md`](AGENTS.md) — instructions for development and AI collaboration
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — current technical architecture
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — accepted architectural decisions
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — current implementation progress
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — planned development path

These documents are treated as the project's primary persistent source of truth.

## Development Approach

The project is developed incrementally.

Each major development phase begins with a documentation review to verify that:

1. the current architecture is still appropriate,
2. accepted decisions are still valid,
3. actual progress matches the documented state,
4. the roadmap is still pointing in the right direction.

If a significant architectural or technical change is identified, it is discussed and approved before implementation.

Development should favor small, verifiable changes over large speculative implementations.

## Data and Images

The application will work with existing coin photographs and existing data stored in XLS/XLSX files.

Original photographs are treated as external collection data rather than source-code assets. The application will store references and metadata rather than requiring the original photographs to be committed to Git.

Detailed data models, image organization, and import mappings will be defined in later development phases.

## Development Setup

Detailed setup and run instructions will be added after the development environment has been configured and verified.

Until then, this README intentionally does not document unverified commands, versions, or configuration details.
