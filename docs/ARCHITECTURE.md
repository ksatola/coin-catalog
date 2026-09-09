# Coin Catalog — Architecture

## 1. Overview

Coin Catalog is a personal web application for managing a collection of coins.

The application combines:

- a Python backend,
- a relational database,
- a browser-based frontend,
- filesystem-based coin photographs,
- import of existing spreadsheet data.

The architecture is intentionally simple at the initial stage and should remain extensible as the application grows.

---

## 2. High-Level Architecture

```text
┌─────────────────────────────────────────────┐
│                Host Computer                │
│                                             │
│  Windows 11 / macOS                         │
│                                             │
│  ┌───────────────┐                          │
│  │ Web Browser   │                          │
│  └───────┬───────┘                          │
│          │ HTTP                             │
│          ▼                                  │
│  ┌───────────────────────────────────────┐  │
│  │          Docker Dev Container         │  │
│  │                                       │  │
│  │  ┌──────────────┐  ┌───────────────┐ │  │
│  │  │ Vue 3 /      │  │ FastAPI /     │ │  │
│  │  │ TypeScript / │◄─►│ Python        │ │  │
│  │  │ Vite         │  │               │ │  │
│  │  └──────────────┘  └───────┬───────┘ │  │
│  │                            │           │  │
│  │                            ▼           │  │
│  │                     ┌──────────────┐  │  │
│  │                     │ SQLAlchemy   │  │  │
│  │                     └──────┬───────┘  │  │
│  │                            │           │  │
│  │                            ▼           │  │
│  │                     ┌──────────────┐  │  │
│  │                     │    SQLite    │  │  │
│  │                     └──────────────┘  │  │
│  │                                       │  │
│  │  Filesystem: coin photographs        │  │
│  └───────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

The exact container topology may be refined during implementation.

---

## 3. Repository and Source Tree

The repository root is the shared workspace for documentation, development configuration, Git metadata, and repository-level files.

Backend and frontend projects use separate top-level directories:

```text
coin-catalog/
├── AGENTS.md
├── README.md
├── .devcontainer/
├── docs/
├── backend/
│   ├── .python-version
│   ├── pyproject.toml
│   ├── uv.lock
│   └── src/
│       └── coin_catalog/
│           ├── __init__.py
│           └── main.py
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
```

The `frontend/` directory contains the Vue 3 + TypeScript + Vite application. The backend source is under `backend/src/coin_catalog/`.

This separation prevents the backend and frontend source trees from being mixed while keeping both projects inside the same repository and Dev Container workspace.

---

## 4. Development Environment

Development uses:

- Docker
- VS Code
- VS Code Dev Containers
- Linux-based container

The goal is to keep project-specific development dependencies inside the container.

The host computer is primarily responsible for:

- running Docker,
- running VS Code,
- providing the browser,
- providing Git access.

---

## 5. Backend

The backend is implemented in Python using FastAPI.

The backend project is located under `backend/`, with Python source under `backend/src/coin_catalog/`.

Responsibilities include:

- exposing HTTP API endpoints,
- application/business logic,
- request validation,
- database access,
- filesystem/image management,
- spreadsheet import,
- coordination of application services.

The backend should be organized into logical layers as the application grows.

The initial implementation should avoid creating unnecessary abstractions before they are needed.

---

## 6. Database

SQLite is the initial database engine.

SQLAlchemy provides the application's database abstraction and ORM layer.

Conceptually:

```text
FastAPI
   │
   ▼
Application / Service Logic
   │
   ▼
SQLAlchemy
   │
   ▼
SQLite
```

The detailed database schema will be designed in a later development phase.

---

## 7. Frontend

The frontend is a Vue 3 application using:

- Vue 3
- TypeScript
- Vite

The frontend project is located under `frontend/`, with source code under `frontend/src/`.

The frontend is responsible for:

- displaying the coin catalogue,
- browsing and filtering,
- searching,
- displaying coin photographs,
- managing user interactions,
- communicating with the backend API.

Conceptually:

```text
Browser
   │
   ▼
Vue 3 Application
   │
   │ HTTP
   ▼
FastAPI API
```

Frontend implementation should use Vue components and TypeScript rather than building the application around raw JavaScript.

---

## 8. API Communication

The frontend and backend communicate through HTTP.

The backend provides an API consumed by the Vue frontend.

During development, Vite proxies frontend `/api/...` requests to the FastAPI development server on port `8000`. The frontend therefore uses relative `/api/...` paths for the initial development API connection.

The exact API structure, endpoint naming, request/response models, and versioning strategy will be defined when the relevant application functionality is implemented.

No detailed API contract is established yet.

---

## 9. Coin Photographs

Original coin photographs are stored as files rather than database BLOBs.

The database stores references and metadata associated with those photographs.

Conceptually:

```text
SQLite
  │
  └── coin record
        │
        └── image reference
                │
                ▼
        Filesystem
                │
                └── original JPG
```

The exact filesystem layout, naming convention, thumbnail strategy, and backup procedure will be designed when image management is implemented.

---

## 10. Spreadsheet Import

Existing XLS/XLSX files are an external source of coin metadata.

The import process will eventually follow a flow similar to:

```text
XLS/XLSX
   │
   ▼
Import / Validation
   │
   ▼
Application Data Model
   │
   ▼
SQLite
```

The exact source columns, mappings, validation rules, duplicate handling, and error reporting will be defined after the initial data model exists.

---

## 11. Data Ownership

The project distinguishes between:

### Application source code

Stored in the Git repository.

### Application configuration

Stored in the project where appropriate, excluding secrets and machine-specific values.

### Database

Runtime/application data stored separately from source code.

### Coin photographs

External filesystem data.

### Source spreadsheets

External user data used for import.

User collection data should not be committed to the Git repository unless explicitly decided.

---

## 12. Portability

The architecture targets:

- Windows 11
- macOS

The application should not depend on platform-specific runtime behaviour.

Docker provides the primary environment boundary.

Filesystem handling must account for differences between host operating systems, particularly path handling and mounted directories.

---

## 13. Security and Sensitive Data

Secrets, credentials, personal data, and private collection data must not be committed to Git.

Configuration containing secrets should be provided through environment variables or another appropriate mechanism.

Security requirements will be refined as application functionality is implemented.

---

## 14. Testing

Testing will be introduced incrementally.

The expected test areas include:

- backend/application logic,
- API behaviour,
- database operations,
- spreadsheet import,
- frontend behaviour,
- integration between frontend and backend.

The exact testing framework and test strategy will be selected when implementation reaches the relevant stage.

---

## 15. Deployment Model

The initial project priority is development rather than production deployment.

The development environment and eventual runtime environment should remain as similar as reasonably practical.

A production/deployment architecture will be defined separately when the application reaches a stage where deployment is required.

---

## 16. Current Architecture Boundaries

The following are intentionally **not yet fully specified**:

- detailed database schema,
- coin entity model,
- API contract,
- frontend component hierarchy,
- image directory structure,
- spreadsheet import mapping,
- authentication,
- authorization,
- backup mechanism,
- production deployment,
- CI/CD pipeline,
- testing framework details.

These should be decided when their respective implementation phases are reached rather than being designed speculatively.
