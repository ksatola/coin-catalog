# Coin Catalog — Development Environment

This document contains the detailed, verified instructions for opening and using the Coin Catalog development environment.

For coding style, quality, documentation, testing, and related development conventions, see [`CODING_STANDARDS.md`](CODING_STANDARDS.md).

## Host Requirements

The host machine is intentionally kept minimal. The following software is required on the host:

- GitHub Desktop
- Visual Studio Code
- Docker Desktop

Python, Node.js, `uv`, and project-specific application dependencies are provided by the Dev Container and do not need to be installed directly on the host.

## Git Branch Workflow

`main` is the stable branch. Do not develop or commit directly on `main`.

Development normally happens on a dedicated working branch. For a development phase, use the naming pattern:

```text
phase-N-short-description
```

For example:

```text
phase-3-database-foundation
```

For smaller independent changes, `feature/`, `fix/`, or `docs/` branches may be used.

The complete branching strategy is documented in:

```text
docs/GIT_WORKFLOW.md
```

### Recommended GitHub Desktop procedure

1. Open the `coin-catalog` repository in GitHub Desktop.
2. Fetch/pull the latest changes from `origin`.
3. Make sure the current branch is `main`.
4. Create a new branch from the current `main` using **Branch → New Branch**.
5. Give the branch a descriptive phase or working-branch name.
6. Publish the branch to `origin`.
7. Switch to that branch and continue development there.

Before starting substantial work, verify that the working branch contains the latest stable `main`. If `main` has advanced since the branch was created, synchronize the branch before proceeding.

### Working in VS Code

The current Git branch is shown in the lower-left corner of VS Code. You can use the branch control to switch branches and, where appropriate, create a branch.

Development and application execution work normally from a working branch. The Dev Container uses the checked-out repository workspace, so it is not tied to `main`.

A normal workflow is therefore:

```text
working branch
→ edit in VS Code
→ run inside Dev Container
→ test in browser / terminal
→ commit
→ push branch
→ continue
```

When the work is complete, test and document it, push the branch, and open a pull request to `main`. Merge only after the relevant implementation, tests, documentation, and verification are complete.

After a phase is merged, update local `main` and create the next phase branch from the updated stable branch.

The project intentionally does not use a permanent `develop` branch.

## Open the Project in VS Code

1. Start Docker Desktop and wait until Docker is running.
2. Open Visual Studio Code.
3. Open the local `coin-catalog` repository:
   - **Windows:** press `Ctrl+O`.
   - **macOS:** press `Cmd+O`.
4. Select the local `coin-catalog` folder and open it.
5. In the VS Code Explorer, verify that the repository files are visible, including `.devcontainer`, `docs`, `AGENTS.md`, and `README.md`.

## Reopen the Project in the Dev Container

1. Open the VS Code Command Palette:
   - **Windows:** press `Ctrl+Shift+P`.
   - **macOS:** press `Cmd+Shift+P`.
2. Type:

   `Dev Containers: Reopen in Container`

3. Select **Dev Containers: Reopen in Container** and press `Enter`.
4. VS Code will build the development container the first time and then reopen the project inside the container.
5. Wait until the container has finished building and VS Code has reconnected to it.

The repository is mounted as the complete workspace at:

```text
/workspaces/coin-catalog
```

The entire repository is available inside the container, including Git metadata, development configuration, documentation, and application source files.

## Verify the Development Container

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
/workspaces/coin-catalog
```

These commands and the repository workspace path were successfully verified inside the Dev Container on 2026-09-09.

## Python Project

The Python backend is located under `backend/`.

The current Python project structure is:

```text
backend/
├── .python-version
├── pyproject.toml
├── alembic.ini
├── migrations/
│   └── versions/
├── tests/
│   └── test_database.py
└── src/
    └── coin_catalog/
        ├── __init__.py
        ├── database.py
        └── main.py
```

`backend/.python-version` currently contains:

```text
3.14
```

`backend/pyproject.toml` declares Python `>=3.14`, uses the `uv_build` build backend, and includes the FastAPI standard extra used by the development CLI. Python project commands should be run from the backend project directory:

```bash
cd /workspaces/coin-catalog/backend
```

The original Python project was initialized with `uv init --python 3.14` and was subsequently reorganized into the `backend/` directory so that backend and frontend source trees remain clearly separated.

The Python project reorganization was successfully committed to the repository on 2026-09-09. The reorganized project was subsequently verified inside the user's local Dev Container by running:

```bash
uv run python -c "import coin_catalog; print('backend import OK')"
```

The command completed successfully and produced:

```text
backend import OK
```

### Python tests and code quality

Run Python project quality checks from the backend directory:

```bash
cd /workspaces/coin-catalog/backend
uv run pytest
uv run ruff check .
uv run ruff format --check .
```

`pytest` runs the backend test suite. `ruff check .` runs Ruff lint checks, and `ruff format --check .` verifies that Python files are formatted according to the project's Ruff configuration.

When adding or updating Python development dependencies, use `uv` from the backend directory. For example:

```bash
cd /workspaces/coin-catalog/backend
uv add --dev pytest ruff
```

After dependency changes, commit the corresponding `pyproject.toml` and `uv.lock` changes together when they belong to the same dependency update.

The initial database session test was verified on 2026-09-11 with:

```text
1 passed
```

### Database and migrations

The backend uses SQLite with SQLAlchemy. Alembic manages database schema migrations.

The database is stored at:

```text
/workspaces/coin-catalog/data/coin-catalog.db
```

Run Alembic commands from the backend project directory:

```bash
cd /workspaces/coin-catalog/backend
```

Check the current database migration revision:

```bash
uv run alembic current
```

Create a new migration revision after a model/schema change:

```bash
uv run alembic revision --autogenerate -m "describe schema change"
```

Review the generated migration before applying it.

Apply pending migrations:

```bash
uv run alembic upgrade head
```

Show the migration history:

```bash
uv run alembic history
```

Alembic uses the database URL configured by the backend's `coin_catalog.database.DATABASE_URL`. The Alembic environment therefore uses the same canonical database location as the application.

Migration files are version-controlled under:

```text
backend/migrations/versions/
```

The SQLite database itself remains under the Git-ignored `data/` directory.

### FastAPI application

The initial FastAPI application is defined in:

```text
backend/src/coin_catalog/main.py
```

It currently provides a single health endpoint:

```text
GET /health
```

FastAPI was added with `uv` using:

```bash
uv add fastapi
uv add "fastapi[standard]"
```

The FastAPI import and CLI were verified successfully. The development server was also verified successfully with:

```bash
uv run fastapi dev src/coin_catalog/main.py --host 0.0.0.0 --port 8000
```

The server started on port `8000`, completed application startup, and responded successfully to:

```bash
curl http://localhost:8000/health
```

with:

```json
{"status":"ok"}
```

### FastAPI development server

Run from the backend directory:

```bash
cd /workspaces/coin-catalog/backend
uv run fastapi dev src/coin_catalog/main.py --host 0.0.0.0 --port 8000
```

The Dev Container forwards port `8000` for the backend.

For direct browser or HTTP access during development:

- `http://localhost:8000/health` — backend health endpoint; expected response is `{"status":"ok"}`.
- `http://localhost:8000/docs` — FastAPI interactive API documentation.
- `http://localhost:8000/` — no application route is currently defined, so `404 Not Found` is expected.

When finished with the development server, return to the terminal running FastAPI and press:

```text
Ctrl+C
```

## Frontend Project

The Vue frontend is located under `frontend/`.

The frontend was created as a standard Vue 3 + TypeScript + Vite project using the official Vue scaffolding tool. The project was intentionally created as a blank Vue project rather than retaining the scaffold's example application code.

The initial scaffolding choices were:

- TypeScript: **Yes**
- JSX support: **No**
- Vue Router: **No**
- Pinia: **No**
- Vitest: **No**
- End-to-end testing solution: **No**
- ESLint: **No**
- Prettier: **No**
- Vue DevTools extension: **No**, where prompted
- Skip example code / start with a blank Vue project: **Yes**

No frontend UI framework, state-management library, router, or testing framework was added at this stage. These should be introduced only when an agreed development step requires them.

### Create the frontend from scratch

From the repository root inside the Dev Container, the scaffolding command used was:

```bash
cd /workspaces/coin-catalog
npm create vue@latest frontend
```

If the scaffolding wizard presents a prompt that has not yet been documented or agreed, stop and review the prompt before selecting an option.

### Install frontend dependencies

After scaffolding completed, dependencies were installed from the frontend project directory:

```bash
cd /workspaces/coin-catalog/frontend
npm install
```

The installation completed successfully on 2026-09-09. It added 151 packages, audited 152 packages, and reported:

```text
found 0 vulnerabilities
```

The npm client also displayed a notice about a newer major npm version. This was informational and no npm upgrade was performed.

### Verify the production build

Run:

```bash
cd /workspaces/coin-catalog/frontend
npm run build
```

The production build was successfully verified on 2026-09-09 using Vite 8.2.2. The build transformed 11 modules and generated the `dist/` output directory.

### Run the frontend development server

To make the Vite development server accessible through the Dev Container's forwarded port, run:

```bash
cd /workspaces/coin-catalog/frontend
npm run dev -- --host 0.0.0.0
```

The verified server output included:

```text
Local:   http://localhost:5173/
Network: http://172.17.0.2:5173/
```

The Dev Container forwards port `5173` for the frontend.

For host-browser access during development, use:

```text
http://localhost:5173/
```

### Vite API proxy

During development, frontend API requests use relative `/api/...` paths. Vite proxies these requests to the FastAPI server on port `8000` and removes the `/api` prefix before forwarding.

The configured request flow is:

```text
Browser → Vite :5173 → FastAPI :8000
/api/health           /health
```

The proxy was verified successfully on 2026-09-09 with:

```bash
curl http://localhost:5173/api/health
```

which returned:

```json
{"status":"ok"}
```

### Verify frontend-to-backend communication

With both development servers running:

1. Start FastAPI on port `8000`.
2. Start Vite on port `5173`.
3. Open:

   ```text
   http://localhost:5173/
   ```

4. The Vue application should display:

   ```text
   # Coin Catalog
   Backend status: ok
   ```

This frontend-to-backend health check was successfully verified on 2026-09-09. The Vue application requests `/api/health`; Vite proxies the request to FastAPI `/health`; the returned status is displayed by the frontend.

### Verify host-browser access

With the Vite development server running inside the Dev Container, open the following address in a browser on the host machine:

```text
http://localhost:5173/
```

Host-browser access and frontend-to-backend communication were successfully verified on 2026-09-09.

## Current Scope

At this stage, the development environment, initial Python backend project, FastAPI application skeleton, initial Vue frontend project, and initial database foundation have been established. The FastAPI `/health` endpoint, Vite API proxy, frontend-to-backend health display, SQLAlchemy database session, initial database session test, and Alembic migration tooling have been verified.

The approved Phase 2 development-server arrangement is:

- Vue/Vite on port `5173`
- FastAPI on port `8000`
- Vite `/api` proxy forwarding to FastAPI and removing the `/api` prefix

The frontend currently uses the Vue 3 + TypeScript + Vite foundation and displays the backend health status. Application components, routing, state management, UI libraries, database schema, and other application functionality will be introduced in later agreed steps.

Do not install project dependencies manually before the corresponding development step is agreed and documented.
