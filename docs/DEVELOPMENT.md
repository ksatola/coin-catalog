# Coin Catalog — Development Guide

This document describes the current, verified development environment and the normal local development workflow.

For coding style, quality, documentation, testing, and related conventions, see [`CODING_STANDARDS.md`](CODING_STANDARDS.md).
For the development helper scripts, see [`DEV_SCRIPTS.md`](DEV_SCRIPTS.md).
For branching and merge workflow, see [`GIT_WORKFLOW.md`](GIT_WORKFLOW.md).

## Host Requirements

The host machine is intentionally kept minimal. Install only:

- GitHub Desktop
- Visual Studio Code
- Docker Desktop

Python, Node.js, `uv`, and project-specific dependencies are provided by the Dev Container and do not need to be installed on the host.

## Git Branch Workflow

`main` is the stable branch. Do not develop or commit directly on `main`.

Development normally happens on a dedicated working branch using the pattern:

```text
phase-N-short-description
```

For smaller independent changes, `feature/`, `fix/`, or `docs/` branches may be used.

The complete branching procedure is documented in [`GIT_WORKFLOW.md`](GIT_WORKFLOW.md).

Normal workflow:

```text
update/synchronize branch
→ edit in VS Code
→ run inside Dev Container
→ verify in terminal/browser
→ commit
→ push branch
→ open/update pull request
→ merge to main after verification
```

The project intentionally does not use a permanent `develop` branch.

## Open the Project in VS Code

1. Start Docker Desktop and wait until Docker is running.
2. Open Visual Studio Code.
3. Open the local `coin-catalog` repository.
4. Verify that the repository files are visible, including `.devcontainer`, `docs`, `AGENTS.md`, and `README.md`.

## Reopen in the Dev Container

Use the VS Code Command Palette:

```text
Dev Containers: Reopen in Container
```

The repository is mounted as the workspace:

```text
/workspaces/coin-catalog
```

The entire Git repository is available inside the container.

## Verify the Development Container

Open the integrated terminal in VS Code and run:

```bash
python --version
node --version
uv --version
pwd
```

The verified environment reports:

```text
Python 3.14.7
v24.20.0
uv 0.12.10
/workspaces/coin-catalog
```

## Development Helper Scripts

The repository provides four local helper scripts from the repository root:

```text
./start
./stop
./restart
./status
```

`./start` starts the backend and frontend development services and records their managed process IDs.

`./stop` stops the process groups managed by `./start`.

`./restart` intentionally performs only:

```text
./stop
./start
```

`./status` provides more detailed process and port diagnostics.

See [`DEV_SCRIPTS.md`](DEV_SCRIPTS.md) for the exact behavior and troubleshooting notes.

## Current Development Services

The application currently uses two development servers:

```text
Frontend   http://localhost:5173
Backend    http://localhost:8000
```

The host browser uses the Vite frontend address:

```text
http://localhost:5173/
```

## Backend Project

The Python backend is located under `backend/`.

Current structure:

```text
backend/
├── .python-version
├── pyproject.toml
├── uv.lock
├── alembic.ini
├── migrations/
│   └── versions/
├── tests/
└── src/
    └── coin_catalog/
        ├── __init__.py
        ├── database.py
        ├── main.py
        ├── models.py
        ├── schemas.py
        └── routes/
            ├── __init__.py
            ├── coins.py
            └── dictionaries.py
```

Python project commands are run from:

```bash
cd /workspaces/coin-catalog/backend
```

The backend uses FastAPI, SQLAlchemy, SQLite, and Alembic.

## Python Tests and Code Quality

Run the complete backend verification set:

```bash
cd /workspaces/coin-catalog/backend
uv run pytest
uv run ruff check .
uv run ruff format --check .
```

The current backend test suite verifies coin persistence and API behavior including creation, retrieval, update, dictionary CRUD, archive, restore, and reference-protected dictionary deletion.

The latest user-verified pytest result is:

```text
29 passed, 2 warnings
```

The two warnings are dependency deprecation warnings emitted by the installed FastAPI/Starlette/AnyIO test stack; they are not test failures.

## Database and Migrations

The backend uses SQLite with SQLAlchemy. Alembic manages schema migrations.

The development database is stored at:

```text
/workspaces/coin-catalog/data/coin-catalog.db
```

The database file is not committed to Git.

Run Alembic commands from the backend directory:

```bash
uv run alembic current
uv run alembic history
uv run alembic upgrade head
```

After an approved model/schema change, create a migration with:

```bash
uv run alembic revision --autogenerate -m "describe schema change"
```

Always review generated migrations before applying them.

The current schema contains the `coin` table and the reference tables:

```text
country
issuer
denomination
mint
material
state
era
```

There is intentionally no `currency` table or `currency_id` column.

The `coin` table includes the approved soft-delete flag `is_deleted`. Active coins use `is_deleted = false`; archived coins use `is_deleted = true`.

## FastAPI Application

The FastAPI application is defined in:

```text
backend/src/coin_catalog/main.py
```

The current API provides:

```text
GET  /health

POST /coins
GET  /coins
GET  /coins/{coin_id}
PUT  /coins/{coin_id}
GET  /coins/archived
POST /coins/{coin_id}/archive
POST /coins/{coin_id}/restore

GET    /dictionaries/{dictionary_name}
POST   /dictionaries/{dictionary_name}
PUT    /dictionaries/{dictionary_name}/{item_id}
DELETE /dictionaries/{dictionary_name}/{item_id}
```

The coin archive model is soft deletion; there is no permanent coin DELETE endpoint.

The seven supported dictionaries are:

```text
countries
issuers
denominations
mints
materials
states
eras
```

Dictionary entries cannot be deleted while referenced by a coin. Era references are protected for both `from_era_id` and `to_era_id`.

For direct backend inspection, the FastAPI interactive documentation is available at:

```text
http://localhost:8000/docs
```

## Frontend Project

The Vue frontend is located under `frontend/`.

The current stack is:

```text
Vue 3
TypeScript
Vite
Vue Router
```

The frontend does not currently use Pinia or a UI component framework. Additional dependencies should be introduced only as part of an approved development step.

Frontend commands are run from:

```bash
cd /workspaces/coin-catalog/frontend
```

## Vite API Proxy

During development, frontend requests use relative `/api/...` paths.

Vite proxies those requests to FastAPI on port `8000` and removes the `/api` prefix.

The request flow is:

```text
Browser → Vite :5173 → FastAPI :8000
/api/health           /health
```

Vite polling is enabled so source changes are detected reliably inside the Dev Container.

## Current Frontend Routes

The current application routes are:

```text
/                         → redirect to /monety
/monety                   → active coin browser
/monety/:id               → coin details
/monety/:id/edytuj        → coin editing
/dodaj                    → add coin
/archiwum                 → archived coins
/slowniki                 → dictionary editor
```

A fixed bottom navigation is always visible with:

```text
Monety
Dodaj monetę
Archiwum
Słowniki
```

## Current Coin Browser

The active and archived coin browser supports two layouts:

```text
Grid
List
```

Grid is the default view.

In Grid view, selecting a coin tile opens its details.

In List view, rows are not clickable. Actions are explicit buttons.

Active coins provide:

```text
Szczegóły
Archiwizuj
```

Archived coins provide:

```text
Szczegóły
Przywróć
```

Coin details provide:

```text
Active:    Edytuj, Archiwizuj
Archived:  Przywróć
```

## Current Coin Entry Flow

The coin form uses dictionary-backed selectors rather than manual foreign-key entry.

The current form supports the approved core coin fields, including:

- country
- issuer
- denomination
- date range and era
- mint
- material
- state
- description
- weight
- diameter
- video flag
- source

Basic form validation is implemented for the current entry flow.

## Current Dictionary Editor

The dictionary editor is available at `/slowniki`.

It supports add, edit, and delete operations for all seven reference dictionaries.

Deletion errors are surfaced when a dictionary entry is referenced by a coin.

## Frontend Production Build

Run:

```bash
cd /workspaces/coin-catalog/frontend
npm run build
```

The frontend production build was previously verified successfully with Vite 8.2.2. A final Phase 4 verification run should repeat this command after the latest changes.

## Recommended Local Verification

For the current Phase 4 working branch, run:

```bash
cd /workspaces/coin-catalog/backend
uv run pytest
uv run ruff check .
uv run ruff format --check .

cd ../frontend
npm run build
```

Then start the development services:

```bash
cd /workspaces/coin-catalog
./start
```

Open:

```text
http://localhost:5173/
```

and walk through the main flow:

```text
Monety
→ Grid / List
→ Szczegóły
→ Edytuj
→ Archiwizuj
→ Archiwum
→ Przywróć
→ Dodaj monetę
→ Słowniki
```

When the walkthrough is complete:

```bash
./status
./stop
```

## Current Scope

Phase 4 is the current development phase and covers the first usable coin catalogue workflow:

- coin creation and persistence,
- dictionary-backed coin entry,
- coin browsing in Grid/List views,
- coin details,
- editing,
- soft archive and restore,
- dictionary management,
- local development tooling.

The following work remains outside the current Phase 4 scope:

- spreadsheet import,
- image management,
- advanced search and filtering,
- collections/categories/tags,
- pricing and valuation features,
- OCR and image analysis,
- advanced exports and deployment.

Image handling remains an external-file concern. Coin photographs are not stored as database BLOBs; the database will store references/metadata when image management is implemented.

## Working Rules

Keep implementation changes incremental and verify them at the smallest useful scope.

Before making repository changes, follow the repository change-approval workflow documented in `AGENTS.md`: inspect the current state, show the proposed change, obtain explicit approval, then write the approved change.

Keep documentation synchronized with the actual verified project state.
