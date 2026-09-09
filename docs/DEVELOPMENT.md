# Coin Catalog — Development Environment

This document contains the detailed, verified instructions for opening and using the Coin Catalog development environment.

## Host Requirements

The host machine is intentionally kept minimal. The following software is required on the host:

- GitHub Desktop
- Visual Studio Code
- Docker Desktop

Python, Node.js, `uv`, and project-specific application dependencies are provided by the Dev Container and do not need to be installed directly on the host.

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
└── src/
    └── coin_catalog/
        └── __init__.py
```

`backend/.python-version` currently contains:

```text
3.14
```

`backend/pyproject.toml` declares Python `>=3.14`, uses the `uv_build` build backend, and currently has no project dependencies. The generated `backend/src/coin_catalog/__init__.py` contains the placeholder console entry point created by `uv init`.

Python project commands should be run from the backend project directory:

```bash
cd /workspaces/coin-catalog/backend
```

The original Python project was initialized with `uv init --python 3.14` and was subsequently reorganized into the `backend/` directory so that backend and frontend source trees remain clearly separated.

The Python project reorganization was successfully committed to the repository on 2026-09-09. The reorganized project has not yet been rebuilt or otherwise fully verified inside the user's local Dev Container after this change.

## Current Scope

At this stage, the environment and initial Python project metadata are being established. FastAPI, SQLAlchemy, Vue, Vite, and other application dependencies have not yet been added.

Do not install project dependencies manually before the corresponding development step is agreed and documented.
