# Coin Catalog — Architecture

## 1. Overview

Coin Catalog is a personal web application for managing a collection of coins.

The current architecture combines a Python/FastAPI backend, SQLite with SQLAlchemy and Alembic, a Vue 3 + TypeScript + Vite frontend, filesystem-based coin photographs, and Playwright end-to-end UI tests.

The architecture remains intentionally simple and is extended only when required by implemented functionality.

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
│   ├── migrations/
│   ├── tests/
│   └── src/coin_catalog/
└── frontend/
    ├── src/
    └── tests/ui/
```

`images/` and `data/` are runtime data directories and are not versioned as application source.

## 4. Backend and Database

FastAPI provides HTTP endpoints and uses SQLAlchemy for database access. Alembic manages schema migrations.

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

The `coin` table represents a concrete physical coin. It has a technical `id` and an optional user-facing `collection_number` text field. The collection number is independent from the technical ID and does not replace it.

Coins use soft deletion through `is_deleted`. Coin dates use independent year and era endpoints, allowing ranges such as `476 BC → 1 AD` without comparing numeric years across eras.

Categories form a directed acyclic graph through `category_relation`, and coins use the many-to-many `coin_category` association.

## 5. Frontend

The frontend is a Vue 3 application using TypeScript, Vite, and Vue Router. It provides coin creation, editing, browsing, details, archive/restore, optional collection-number entry and display, dictionaries, images, categories, coin-category assignment, and search/filtering.

The application uses component-based Vue code and does not currently depend on Pinia or a UI component framework.

## 6. API Communication

Frontend requests use relative `/api/...` paths and Vite proxies them to FastAPI during development.

Coin CRUD endpoints support the optional `collection_number` field through the request and response schemas. Coin search includes the collection number among searchable fields.

Dictionary, category, coin-category, and image endpoints remain provided by their dedicated route modules.

## 7. Coin Photographs

Coin photographs are stored as external JPG files rather than SQLite BLOBs. The accepted storage decision is documented in `docs/IMAGE_STORAGE_DECISION.md`.

The current convention is:

```text
images/
├── 000404 - awers.jpg
├── 000404 - rewers.jpg
├── 000404 - 01.jpg
└── ...
```

## 8. Manual Data Entry

Coin collection data is entered manually through the application. There is currently no XLS/XLSX import mechanism. The dictionary-backed coin form and optional collection-number field are part of the current data-entry path.

## 9. Portability

The architecture targets Windows 11 and macOS through the Docker-based development environment. Filesystem handling must remain portable across host platforms.

## 10. Testing

Current automated verification includes backend pytest tests, backend Ruff checks, the frontend production build, and Playwright UI tests.

Playwright coverage includes coin/image workflows, category workflows, Collection Number create/edit behavior, and catalogue search behavior.

Broader integration and CI coverage remain future work.

## 11. Deployment Model

The current priority is local development rather than production deployment. A production deployment architecture will be defined when deployment becomes an actual requirement.

## 12. Current Architecture Boundaries

The following remain future or conditional work:

- pagination or other large-collection browser optimization;
- broader collections and tags;
- backup/recovery automation;
- production deployment;
- CI/CD pipeline.

The current category model, search/filtering, and collection-number workflow are implemented. The architecture should be updated when new active development materially changes these boundaries.
