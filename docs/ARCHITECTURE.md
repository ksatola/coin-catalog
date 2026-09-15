# Coin Catalog — Architecture

## 1. Overview

Coin Catalog is a personal web application for managing a collection of coins.

The current architecture combines:

- a Python/FastAPI backend,
- SQLite with SQLAlchemy and Alembic,
- a Vue 3 + TypeScript + Vite frontend,
- filesystem-based coin photographs,
- Playwright end-to-end UI tests.

The architecture remains intentionally simple and is extended only when required by implemented functionality.

---

## 2. High-Level Architecture

```text
Host Computer
    │
    └── Web Browser
          │ HTTP
          ▼
    Docker Dev Container
          │
          ├── Vue 3 / TypeScript / Vite
          │        │ /api/... proxy
          │        ▼
          ├── FastAPI / Python
          │        │
          │        ├── SQLAlchemy → SQLite
          │        │
          │        └── Image service → images/
          │
          └── Playwright UI tests
```

During development Vite serves the frontend on port `5173` and proxies `/api/...` requests to FastAPI on port `8000`.

---

## 3. Repository and Source Tree

```text
coin-catalog/
├── AGENTS.md
├── README.md
├── .devcontainer/
├── docs/
├── data/
├── images/
├── backend/
│   ├── .python-version
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── migrations/
│   │   └── versions/
│   ├── uv.lock
│   ├── tests/
│   └── src/
│       └── coin_catalog/
│           ├── __init__.py
│           ├── database.py
│           ├── main.py
│           ├── models.py
│           ├── schemas.py
│           └── routes/
│               ├── __init__.py
│               ├── categories.py
│               ├── coin_categories.py
│               ├── coins.py
│               ├── dictionaries.py
│               └── images.py
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── vite.config.ts
    ├── src/
    └── tests/
        └── ui/
```

`images/` contains external collection photographs and is ignored by Git. `data/` contains the local SQLite database and is also runtime data rather than source code.

---

## 4. Development Environment

Development uses:

- Docker
- VS Code
- VS Code Dev Containers
- Linux-based container

The verified workspace path is `/workspaces/coin-catalog`.

The host primarily provides Docker, VS Code, browser access, and Git. Project-specific Python and Node dependencies are provided by the container.

---

## 5. Backend

The backend is implemented in Python using FastAPI.

Responsibilities include:

- HTTP API endpoints,
- request/response schemas,
- database access through SQLAlchemy,
- coin CRUD and archive/restore behavior,
- dictionary CRUD,
- category management and category-to-coin relationships,
- coin-image metadata and filesystem operations.

The backend uses explicit route modules rather than placing the complete API in `main.py`.

---

## 6. Database

SQLite is the application database. SQLAlchemy provides the ORM and Alembic manages schema migrations.

The current domain model contains:

```text
coin
country
issuer
denomination
mint
material
state
 era
category
category_relation
coin_category
coin_image
```

The `coin` table represents a concrete physical coin. Reference tables provide reusable catalogue values. Categories and image metadata are represented separately from the core coin fields.

Categories form a flexible directed acyclic graph through `category_relation`: a category may have multiple parents and multiple children. Coins are related to categories through the many-to-many `coin_category` association. The backend rejects category relationships that would create a cycle.

Coins use soft deletion through `is_deleted`; archived coins remain in the database and are excluded from the active list.

Coin dates use two independent endpoints:

```text
from_year + from_era_id
to_year   + to_era_id
```

The numeric year values are not compared across eras. This allows historically meaningful ranges such as `476 BC → 1 AD`.

Weight is stored as `NUMERIC` in grams and diameter as `NUMERIC` in millimetres. `has_video` is a boolean flag and `source` is a single optional text field.

---

## 7. Frontend

The frontend is a Vue 3 application using:

- Vue 3
- TypeScript
- Vite
- Vue Router

The frontend provides the user-facing catalogue workflow, including coin creation, editing, browsing, details, archive/restore, dictionary management, image selection, category management, category relationship management, and coin-category assignment/removal.

Category management is exposed through the `/kategorie` route. The category UI supports category CRUD, multiple parents and children, relation removal, cycle-error handling, and deletion protection messages. Coin-category assignment is exposed within the coin workflow and supports adding and removing assigned categories.

The application uses component-based Vue code and does not currently depend on Pinia or a UI component framework.

---

## 8. API Communication

Frontend requests use relative `/api/...` paths. Vite proxies them to FastAPI during development.

Current API groups are:

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

Category relationships are validated to prevent cycles. A category cannot be deleted while it is assigned to a coin or participates in a category relationship.

The image upload API supports primary `avers` and `rewers` images plus sequential additional images. Primary replacement requires explicit replacement confirmation.

---

## 9. Coin Photographs

Coin photographs are stored as external JPG files rather than SQLite BLOBs.

The accepted storage decision is documented in `docs/IMAGE_STORAGE_DECISION.md`.

The current convention is:

```text
images/
├── 000404 - awers.jpg
├── 000404 - rewers.jpg
├── 000404 - 01.jpg
├── 000404 - 02.jpg
└── ...
```

The current coin-entry workflow requires one primary `awers` image and one primary `rewers` image when a coin is saved. Additional images are sequentially numbered. SQLite stores image metadata and references, including image kind and ordering.

Image files are ignored by Git. The application must never silently overwrite an existing image; replacement is an explicit user action.

---

## 10. Manual Data Entry

Coin collection data is entered manually through the application. There is currently no XLS/XLSX import mechanism and no planned spreadsheet-import workflow in the current roadmap.

The application data model and dictionary-backed coin form are therefore the current data-entry path.

---

## 11. Data Ownership

### Application source code

Stored in Git.

### Application configuration

Stored in the project where appropriate, excluding secrets and machine-specific values.

### Database

Runtime data stored separately from source code.

### Coin photographs

External files under `images/` and excluded from Git.

### Collection metadata

Entered manually through the application and stored in the application database.

User collection data should not be committed to Git unless explicitly decided.

---

## 12. Portability

The architecture targets Windows 11 and macOS through the Docker-based development environment.

Filesystem handling must remain portable across host platforms, especially for mounted directories and image paths.

---

## 13. Security and Sensitive Data

Secrets, credentials, personal data, and private collection data must not be committed to Git.

Configuration containing secrets should use environment variables or another appropriate mechanism.

Authentication and authorization are not currently implemented.

---

## 14. Testing

Current automated verification includes:

- backend pytest tests,
- backend Ruff checks,
- frontend production build,
- Playwright UI tests.

The Playwright UI coverage includes the coin/image workflows plus category management, category relationship handling, cycle prevention behavior, category deletion protection, and coin-category assignment/removal.

Broader integration and CI coverage remain future work.

---

## 15. Deployment Model

The current priority is local development rather than production deployment.

A production deployment architecture will be defined when deployment becomes an actual requirement.

---

## 16. Current Architecture Boundaries

The following are not yet fully specified or implemented:

- advanced search and filtering,
- broader collections and tags,
- authentication and authorization,
- backup/recovery automation,
- production deployment,
- CI/CD pipeline.

The category data model, backend APIs, and current user-facing category workflows are implemented. Future category work is limited to broader organization and collection/tag capabilities unless new requirements are approved.

The architecture should be updated when these areas become active development work.
