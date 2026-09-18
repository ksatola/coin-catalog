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
          │        └── Image service → data/images/collection-*/
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
│   ├── coin-catalog.db
│   └── images/
│       ├── collection-001/
│       └── collection-002/
├── backend/
│   ├── migrations/
│   ├── tests/
│   └── src/coin_catalog/
└── frontend/
    ├── src/
    └── tests/ui/
```

`data/` is runtime application data and is not versioned as application source.

## 4. Backend and Database

FastAPI provides HTTP endpoints and uses SQLAlchemy for database access. Alembic manages schema migrations.

The current domain model contains:

```text
collection
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

The `collection` table represents a user-defined collection within the shared SQLite database. Collection names are unique. Empty collections are allowed, while collections containing coins cannot be deleted through normal application functionality.

The `coin` table represents a concrete physical coin. Each coin belongs to exactly one collection through `collection_id`. It has a globally unique technical `id` and an optional user-facing `collection_number` text field. The collection number is independent from the technical ID and does not replace it.

Moving a coin between collections creates a new technical `coin.id`. The user-facing `collection_number` is preserved during the move unless the user changes it separately. Associated image metadata and files move to the target collection using filenames derived from the new technical ID.

Coins use soft deletion through `is_deleted`. Coin dates use independent year and era endpoints, allowing ranges such as `476 BC → 1 AD` without comparing numeric years across eras.

Categories form a directed acyclic graph through `category_relation`, and coins use the many-to-many `coin_category` association. Categories are shared across all collections.

## 5. Frontend

The frontend is a Vue 3 application using TypeScript, Vite, and Vue Router. It provides coin creation, editing, browsing, details, archive/restore, collection management, collection selection, collection-aware search/filtering, optional collection-number entry and display, dictionaries, images, categories, coin-category assignment, and collection-aware coin moves.

The application uses component-based Vue code and does not currently depend on Pinia or a UI component framework.

## 6. API Communication

Frontend requests use relative `/api/...` paths and Vite proxies them to FastAPI during development.

Coin CRUD endpoints support collection selection and the optional `collection_number` field through the request and response schemas. Coin search includes the collection number among searchable fields and supports filtering by one or multiple collections in combination with existing search and filter criteria.

Collection endpoints provide collection management and collection-aware coin operations.

Dictionary, category, coin-category, and image endpoints remain provided by their dedicated route modules.

## 7. Coin Photographs

Coin photographs are stored as external JPG files rather than SQLite BLOBs. The current image-storage decision is recorded in `docs/DECISIONS.md`.

Images are organized by collection, with no per-coin subdirectories:

```text
data/
├── coin-catalog.db
└── images/
    ├── collection-001/
    │   ├── 000404 - awers.jpg
    │   ├── 000404 - rewers.jpg
    │   ├── 000405 - awers.jpg
    │   └── ...
    └── collection-002/
        └── ...
```

Within a collection, filenames use the six-digit technical coin ID and the established image suffix convention.

The database stores image metadata and filenames. Each image reference must correspond to an existing file in the directory belonging to the coin's current collection.

Moving a coin creates a new technical coin ID and therefore new image filenames. The move operation must keep database records and filesystem state consistent and must provide compensating rollback when any part of the operation fails.

## 8. Manual Data Entry

Coin collection data is entered manually through the application. There is currently no XLS/XLSX import mechanism. The dictionary-backed coin form, collection selection, and optional collection-number field are part of the current data-entry path.

## 9. Portability

The architecture targets Windows 11 and macOS through the Docker-based development environment. Filesystem handling must remain portable across host platforms.

## 10. Testing

Current automated verification includes backend pytest tests, backend Ruff checks, the frontend production build, and Playwright UI tests.

Playwright coverage includes coin/image workflows, category workflows, Collection Number create/edit behavior, catalogue search behavior, and collection workflows including collection selection, multi-collection filtering, coin moves, and image/file consistency.

Broader integration and CI coverage remain future work.

## 11. Deployment Model

The current priority is local development rather than production deployment. A production deployment architecture will be defined when deployment becomes an actual requirement.

## 12. Current Architecture Boundaries

The following remain future or conditional work:

- pagination or other large-collection browser optimization;
- backup/recovery automation;
- production deployment;
- CI/CD pipeline.

Collections, collection-aware coin management, collection-aware image storage, collection filtering, and coin moves are part of the active Phase 8 architecture.

The current category model, search/filtering, collection-number workflow, and collection functionality are implemented.
