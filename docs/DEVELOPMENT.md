# Coin Catalog — Development Guide

This document describes the current, verified development environment and normal local workflow.

For coding style and quality conventions, see [`CODING_STANDARDS.md`](CODING_STANDARDS.md).
For helper scripts, see [`DEV_SCRIPTS.md`](DEV_SCRIPTS.md).
For branching and merge workflow, see [`GIT_WORKFLOW.md`](GIT_WORKFLOW.md).
For image storage rules, see [`IMAGE_STORAGE_DECISION.md`](IMAGE_STORAGE_DECISION.md).

## Host Requirements

Install on the host:

- GitHub Desktop
- Visual Studio Code
- Docker Desktop

Python, Node.js, `uv`, and project dependencies are provided by the Dev Container.

## Git Branch Workflow

`main` is the stable branch. Do not develop or commit directly on `main`.

Normal development uses a dedicated branch such as:

```text
phase-N-short-description
```

For smaller independent changes, `feature/`, `fix/`, or `docs/` branches may be used.

Normal workflow:

```text
synchronize branch
→ edit in VS Code
→ run inside Dev Container
→ verify in terminal/browser
→ commit
→ push branch
→ open/update pull request
→ merge to main after verification
```

The project does not use a permanent `develop` branch.

## Dev Container

The repository is mounted at:

```text
/workspaces/coin-catalog
```

Verify the environment with:

```bash
python --version
node --version
uv --version
pwd
```

The verified environment reports Python 3.14.7, Node.js v24.20.0, uv 0.12.10, and the workspace path above.

## Development Helper Scripts

From the repository root:

```text
./start
./stop
./restart
./status
```

`./start` starts the backend and frontend development services.

`./stop` stops services managed by `./start`.

`./restart` is intentionally only `./stop` followed by `./start`.

`./status` provides process and port diagnostics.

See [`DEV_SCRIPTS.md`](DEV_SCRIPTS.md) for details.

## Current Development Services

```text
Frontend   http://localhost:5173
Backend    http://localhost:8000
```

The host browser uses the Vite frontend at `http://localhost:5173/`.

## Backend Project

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
            ├── categories.py
            ├── coin_categories.py
            ├── coins.py
            ├── dictionaries.py
            └── images.py
```

Backend commands run from:

```bash
cd /workspaces/coin-catalog/backend
```

The backend uses FastAPI, SQLAlchemy, SQLite, and Alembic.

## Python Tests and Code Quality

Run:

```bash
cd /workspaces/coin-catalog/backend
uv run pytest
uv run ruff check .
uv run ruff format --check .
```

The backend suite covers coin persistence and API behavior, dictionary CRUD and reference protection, archive/restore behavior, and category/image behavior.

## Database and Migrations

The development database is:

```text
/workspaces/coin-catalog/data/coin-catalog.db
```

The database is not committed to Git.

Run Alembic commands from the backend directory:

```bash
cd /workspaces/coin-catalog/backend
uv run alembic current
uv run alembic history
uv run alembic upgrade head
```

After an approved schema change:

```bash
uv run alembic revision --autogenerate -m "describe schema change"
```

Always review generated migrations before applying them.

The schema includes the coin table, seven reference tables, category structures, and coin-image metadata. There is intentionally no `currency` table or `currency_id` column.

Coins use `is_deleted` for soft archive/restore.

## FastAPI Application

The FastAPI application is defined in:

```text
backend/src/coin_catalog/main.py
```

Current API:

```text
GET  /health

POST /coins
GET  /coins
GET  /coins/archived
GET  /coins/{coin_id}
PUT  /coins/{coin_id}
POST /coins/{coin_id}/archive
POST /coins/{coin_id}/restore

GET    /dictionaries/{dictionary_name}
POST   /dictionaries/{dictionary_name}
PUT    /dictionaries/{dictionary_name}/{item_id}
DELETE /dictionaries/{dictionary_name}/{item_id}

GET    /categories
POST   /categories
GET    /categories/{category_id}
PUT    /categories/{category_id}
DELETE /categories/{category_id}
POST   /categories/{category_id}/parents/{parent_id}
DELETE /categories/{category_id}/parents/{parent_id}
GET    /categories/{category_id}/children
GET    /categories/{category_id}/parents

GET    /coins/{coin_id}/categories
POST   /coins/{coin_id}/categories/{category_id}
DELETE /coins/{coin_id}/categories/{category_id}

GET    /coins/{coin_id}/images
POST   /coins/{coin_id}/images
DELETE /coins/{coin_id}/images/{image_id}
GET    /coins/{coin_id}/images/{image_id}/file
```

There is no permanent coin DELETE endpoint.

The seven dictionaries are:

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

Category relationships are checked to prevent cycles. Categories cannot be deleted while they are used by a coin or participate in a category relationship.

Interactive API documentation is available at `http://localhost:8000/docs`.

## Frontend Project

The frontend is under `frontend/` and uses:

```text
Vue 3
TypeScript
Vite
Vue Router
Playwright
```

There is no Pinia or UI component framework at this stage.

Frontend commands run from:

```bash
cd /workspaces/coin-catalog/frontend
```

## Vite API Proxy

Frontend requests use relative `/api/...` paths. Vite proxies them to FastAPI on port `8000` and removes the `/api` prefix.

```text
Browser → Vite :5173 → FastAPI :8000
/api/health           /health
```

Vite polling is enabled for reliable source-change detection inside the Dev Container.

## Current Frontend Routes

```text
/                         → redirect to /monety
/monety                   → active coin browser
/monety/:id               → coin details
/monety/:id/edytuj        → coin editing
/dodaj                    → add coin
/archiwum                 → archived coins
/slowniki                 → dictionary editor
/kategorie                → category management
```

The fixed bottom navigation contains `Monety`, `Dodaj monetę`, `Archiwum`, and `Słowniki`.

## Current Coin Browser and Entry Flow

The browser supports Grid and List layouts. Grid is the default.

Grid tiles open details. List rows are not clickable; actions are explicit buttons.

Active coins provide `Szczegóły` and `Archiwizuj`. Archived coins provide `Szczegóły` and `Przywróć`.

Coin details provide `Edytuj` and `Archiwizuj` for active coins, and `Przywróć` for archived coins.

The coin form uses dictionary-backed selectors and supports the core coin fields, including country, issuer, denomination, year/era range, mint, material, state, description, weight, diameter, video flag, and source.

Date endpoints contain both a numeric year and an era. Numeric years are not compared across eras, so a range such as `476 BC → 1 AD` is valid.

## Categories

The frontend exposes category management at `/kategorie`. It supports category creation and editing, multiple parent and child relationships, relation removal, cycle-error handling, and deletion protection when a category is still related or assigned to a coin.

Coin-category assignment/removal is implemented in the coin workflow. Assigned categories can be added and removed through the nested coin-category API.

## Coin Images

Image management is implemented for primary and additional photographs.

The accepted storage convention uses a top-level `images/` directory, ignored by Git, with flat six-digit filenames such as:

```text
000404 - awers.jpg
000404 - rewers.jpg
000404 - 01.jpg
```

The database stores image metadata; image contents are files, not SQLite BLOBs. Primary replacement requires explicit replacement confirmation.

See [`IMAGE_STORAGE_DECISION.md`](IMAGE_STORAGE_DECISION.md).

## Manual Data Entry

Collection metadata is entered manually through the application. There is currently no XLS/XLSX import mechanism and no spreadsheet-import phase in the current roadmap.

## Frontend Production Build

Run:

```bash
cd /workspaces/coin-catalog/frontend
npm run build
```

## Playwright UI Tests

The UI tests are located under:

```text
frontend/tests/ui/
```

Run the complete current category and coin UI coverage with:

```bash
cd /workspaces/coin-catalog/frontend
npx playwright test tests/ui/categories.spec.ts tests/ui/category-assignment.spec.ts tests/ui/coins.spec.ts
```

The verified UI coverage includes image replacement, cancellation, additional-image upload, cross-era date ranges, category CRUD and relations, cycle prevention behavior, deletion protection, and coin-category assignment/removal.

## Recommended Local Verification

For the current Phase 4 branch:

```bash
cd /workspaces/coin-catalog/backend
uv run pytest
uv run ruff check .
uv run ruff format --check .

cd /workspaces/coin-catalog/frontend
npm run build
npx playwright test tests/ui/categories.spec.ts tests/ui/category-assignment.spec.ts tests/ui/coins.spec.ts
```

Then:

```bash
cd /workspaces/coin-catalog
./start
```

Open `http://localhost:5173/` and walk through the main coin workflow.

When finished:

```bash
cd /workspaces/coin-catalog
./status
./stop
```

## Current Scope

Phase 4 is complete and currently covers:

- coin creation and persistence;
- dictionary-backed entry;
- Grid/List browsing;
- details and editing;
- soft archive/restore;
- dictionary management;
- primary and additional coin images;
- category management and category relationships;
- coin-category assignment/removal;
- local development tooling;
- automated UI coverage for the current workflows.

Future work includes advanced search/filtering, richer collections/tags, backup/export, CI/CD, and deployment.

## Working Rules

Keep implementation changes incremental and verify them at the smallest useful scope.

Before repository changes, follow the approval workflow in `AGENTS.md`: inspect the current state, show the proposed change, obtain explicit approval, then write the approved change.

Keep documentation synchronized with the actual verified project state.
