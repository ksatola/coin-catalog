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

### Host requirements

The development environment is designed so that the host machine only needs:

- GitHub Desktop
- Visual Studio Code
- Docker Desktop

The application runtime and development tooling are provided by the Dev Container. No Python, Node.js, `uv`, or project-specific application dependencies need to be installed directly on the host.

### Open the project in VS Code

1. Start Docker Desktop and wait until Docker is running.
2. Open Visual Studio Code.
3. Open the local `coin-catalog` repository:
   - **Windows:** press `Ctrl+O`.
   - **macOS:** press `Cmd+O`.
4. Select the local `coin-catalog` folder and open it.
5. In the VS Code Explorer, verify that the repository files are visible, including `.devcontainer`, `docs`, `AGENTS.md`, and `README.md`.

### Reopen the project in the Dev Container

1. Open the VS Code Command Palette:
   - **Windows:** press `Ctrl+Shift+P`.
   - **macOS:** press `Cmd+Shift+P`.
2. Type:

   `Dev Containers: Reopen in Container`

3. Select **Dev Containers: Reopen in Container** and press `Enter`.
4. VS Code will build the development container the first time and then reopen the project inside the container.
5. Wait until the container has finished building and VS Code has reconnected to it.

### Verify the development container

Open the integrated terminal in VS Code:

- **Windows:** press `Ctrl+``.
- **macOS:** press `Cmd+``.

Run the following commands individually:

```bash
python --version
node --version
uv --version
pwd
```

The verified development environment currently reports:

```text
Python 3.14.7
v24.20.0
uv 0.12.10
/workspace
```

These commands have been successfully verified inside the Dev Container on 2026-09-09.

### Current scope

At this stage, the Dev Container is only being used to establish the development environment. Application dependencies and application source structure will be added in later phases.

Do not install FastAPI, SQLAlchemy, Vue, Vite, or other project dependencies manually before the corresponding development step is agreed and documented.
