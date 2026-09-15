# Architecture & Project Decisions

This document records accepted decisions that materially affect the Coin Catalog project.

A proposal is not a decision until explicitly accepted by the project owner.

## Decision Statuses

- **Accepted** — currently valid decision.
- **Superseded** — replaced by a later decision.
- **Rejected** — explicitly considered and rejected.
- **Deprecated** — no longer relevant to the project.

---

## D-001 — Project Development Model

**Status:** Accepted  
**Date:** 2026-09-07

Development proceeds in small, explicit steps. Significant architectural decisions require discussion and approval before implementation, and repository documentation is maintained as part of development.

---

## D-002 — GitHub as Project Source of Truth

**Status:** Accepted  
**Date:** 2026-09-07

The GitHub repository is the canonical persistent source of truth. Project knowledge that must survive beyond a conversation is stored in repository documentation.

---

## D-003 — Containerized Development Environment

**Status:** Accepted  
**Date:** 2026-09-07

Development uses Docker and VS Code Dev Containers with a Linux-based container. Project-specific development dependencies belong inside the container; host-specific runtime dependencies should be avoided where practical.

---

## D-004 — Python as Backend Language

**Status:** Accepted  
**Date:** 2026-09-07

Python is the backend language, providing the ecosystem needed for APIs, data processing, spreadsheet import, image processing, and future extensions.

---

## D-005 — `uv` for Python Project Management

**Status:** Accepted  
**Date:** 2026-09-07

`uv` is used for Python project and dependency management. The Python project uses `pyproject.toml` and `uv.lock`, with dependencies managed through `uv`.

---

## D-006 — FastAPI Backend

**Status:** Accepted  
**Date:** 2026-09-07

FastAPI is the backend web framework. The backend exposes application functionality through HTTP APIs.

---

## D-007 — SQLite Database

**Status:** Accepted  
**Date:** 2026-09-07

SQLite is the initial database engine. It is lightweight, portable, and requires no separate database service. A future database-engine change remains possible if justified by requirements.

---

## D-008 — SQLAlchemy

**Status:** Accepted  
**Date:** 2026-09-07

SQLAlchemy is the database abstraction/ORM layer. Database models and database access use SQLAlchemy.

---

## D-009 — Web Application UI

**Status:** Accepted  
**Date:** 2026-09-07

The primary UI is a web application accessed through a browser on the host. A native desktop GUI is not the current UI architecture. Frontend and backend communicate over HTTP.

---

## D-010 — Vue 3 Frontend

**Status:** Accepted  
**Date:** 2026-09-07

Vue 3 is the frontend framework. Frontend functionality is organized primarily into Vue components.

---

## D-011 — TypeScript

**Status:** Accepted  
**Date:** 2026-09-07

TypeScript is used for frontend development to improve maintainability and provide static typing for the growing frontend codebase.

---

## D-012 — Vite

**Status:** Accepted  
**Date:** 2026-09-07

Vite is the frontend development and build tool for the Vue/TypeScript application.

---

## D-013 — Coin Photographs Stored as Files

**Status:** Accepted  
**Date:** 2026-09-07

Original coin photographs are stored as external files rather than SQLite BLOBs. The database stores references and metadata. Exact storage layout and backup strategy will be decided during image management implementation.

---

## D-014 — Existing XLS/XLSX Data as Import Source

**Status:** Accepted  
**Date:** 2026-09-07

Existing XLS/XLSX data will be imported into the application database. Exact spreadsheet structure, mappings, validation, and duplicate handling will be determined during the import phase.

---

## D-015 — Current Development Priority

**Status:** Accepted  
**Date:** 2026-09-07

Development begins with the development environment rather than application features. The first implementation phase is **Phase 1 — Development Environment**.

---

## D-016 — Development Container Runtime Versions

**Status:** Accepted  
**Date:** 2026-09-09

The Dev Container uses:

- Python **3.14.7**
- Node.js **24.20.0**
- `uv` **0.12.10**

These tools are provided inside the container rather than installed on the host. Python 3.14 is selected for this new project; Python 3.13 may be reconsidered if material dependency compatibility problems are encountered.

---

## D-017 — Stable and Pinned Dependency Policy

**Status:** Accepted  
**Date:** 2026-09-09

Development tools and project dependencies use explicitly selected and pinned versions wherever supported. Stable production-quality releases are preferred; prerelease and experimental releases are not used by default. Dependency upgrades are deliberate and tested changes.

---

## D-018 — Verified State / Fact-Based Development

**Status:** Accepted  
**Date:** 2026-09-09

Current project state, completed work, configuration, and test results must be based on facts and verified whenever possible. Assumptions and plans must not be presented as facts. Failures, incomplete work, and unverifiable states must be stated clearly. `docs/PROGRESS.md` records only verified current state.

---

## D-019 — Separate Backend and Frontend Source Trees

**Status:** Accepted  
**Date:** 2026-09-09

The repository uses separate top-level `backend/` and `frontend/` project directories.

The Python backend source is under:

```text
backend/src/coin_catalog/
```

The Vue frontend source is under:

```text
frontend/src/
```

Python project commands are run from `backend/`; frontend project commands are run from `frontend/`. The repository root remains the shared workspace for documentation, development configuration, Git metadata, and other repository-level files.

### Rationale

Separate source trees prevent Python and frontend `src/` directories from being mixed and make the boundaries between the two applications explicit.

### Consequences

- The backend project metadata lives under `backend/`.
- The frontend project lives under `frontend/`.
- The physical project layout is part of the current architecture and should be reflected consistently in project documentation.

---

## D-020 — Vite Development Proxy for Backend API

**Status:** Accepted  
**Date:** 2026-09-09

During development, the Vue frontend communicates with the FastAPI backend through relative `/api/...` paths. Vite proxies these requests to the FastAPI development server on port 8000.

The frontend therefore does not directly address the backend development origin from browser JavaScript, avoiding the need for CORS configuration for the initial development workflow.

The proxy keeps the browser-facing development application on a single origin while allowing the frontend and backend to remain independently runnable. It reduces unnecessary configuration at the application-skeleton stage and avoids coupling frontend code to a development-specific backend URL.

### Consequences

- Vite development configuration will contain the `/api` proxy.
- Frontend API calls should use relative `/api/...` paths rather than hard-coded `http://localhost:8000` URLs.
- CORS is not required for the initial frontend-to-backend development connection.
- If a future architecture requires genuine cross-origin browser requests, CORS policy will be evaluated and configured deliberately.

---

## D-021 — Separate Frontend and Backend Development Servers

**Status:** Accepted  
**Date:** 2026-09-09

The frontend and backend run as separate development servers inside the Dev Container:

- Vue/Vite on port **5173**
- FastAPI on port **8000**

Both ports are exposed/forwarded by the Dev Container for host-browser development.

### Rationale

Keeping the servers independent preserves clear frontend/backend boundaries and allows each development toolchain to operate normally while the Vite proxy provides the browser-facing integration path.

### Consequences

- Frontend and backend can be started, stopped, and tested independently.
- The Dev Container exposes both development ports.
- The initial Phase 2 workflow requires both servers to be running for end-to-end frontend/backend verification.

---

## D-022 — Minimal Backend Application Structure

**Status:** Accepted  
**Date:** 2026-09-09

The initial FastAPI backend uses the following minimal structure:

```text
backend/
├── .python-version
├── pyproject.toml
└── src/
    └── coin_catalog/
        ├── __init__.py
        └── main.py
```

The initial `main.py` contains the FastAPI application and the first health/status endpoint. Additional modules and abstractions will be introduced only when justified by subsequent requirements.

### Rationale

The application skeleton should establish a runnable backend without prematurely introducing database, service, repository, configuration, or other structural layers that are not yet required.

### Consequences

- `main.py` is the initial FastAPI application entry point.
- The first backend functionality is a health/status endpoint.
- Database and broader application structure remain outside the initial skeleton and will be designed in their respective phases.

---

## D-023 — Stable `main` and Phase-Based Working Branches

**Status:** Accepted  
**Date:** 2026-09-09

`main` is the project's stable branch. Development and experimentation must take place on dedicated working branches and must not be committed directly to `main`.

The normal branch for a development phase uses the naming pattern:

```text
phase-N-short-description
```

For example:

```text
phase-3-database-foundation
```

Smaller independent work may use descriptive `feature/`, `fix/`, or `docs/` branches.

Working branches are developed, run, tested, and documented normally. A branch is merged into `main` only after the relevant implementation, tests, documentation, and verification are complete, preferably through a pull request.

The project does not use a permanent `develop` branch.

### Rationale

This provides a simple separation between stable project state and work in progress without introducing the additional complexity of a long-lived integration branch. The existing Docker/Dev Container workflow is independent of Git branch choice, so the application can be developed and run normally from a working branch.

### Consequences

- `main` remains the stable integration point.
- Incomplete phase work can remain isolated on its working branch without destabilizing `main`.
- The next phase should normally be branched from the latest stable `main`.
- Working branches can contain multiple small logical commits.
- Pull requests provide a natural final review and verification point before merging.
- A more complex release or integration branching model will require a separate project decision.

---

## D-024 — Application Data Directory Inside Repository Working Tree

**Status:** Accepted  
**Date:** 2026-09-09

Persistent application data is stored in a top-level `data/` directory inside the repository working tree. The `data/` directory is ignored by Git and is not part of the repository's versioned source or documentation.

The initial SQLite database is:

```text
/workspaces/coin-catalog/data/coin-catalog.db
```

### Rationale

Keeping application data under the Dev Container workspace simplifies the development environment and avoids a separate persistent `/data` mount. Git provides the source-control boundary, while `.gitignore` ensures runtime data is not committed.

### Consequences

- The database and future local application data can use a simple repository-relative `data/` path.
- Git will not track files under `data/`.
- Branch changes do not alter the local database because the database is not version-controlled.
- Backup and portability of application data remain separate concerns and will be addressed later.

---

## D-025 — Project Coding Standards

**Status:** Accepted  
**Date:** 2026-09-09

The project follows the coding conventions documented in [`docs/CODING_STANDARDS.md`](CODING_STANDARDS.md).

The standard establishes a deliberately small professional baseline, including:

- PEP 8 and modern Python conventions,
- Ruff for Python formatting and linting,
- type hints and Pyright for static type checking,
- Google-style docstrings for public Python code where useful,
- pytest for Python testing,
- Vue 3 and TypeScript conventions for frontend code,
- explicit error-handling and security practices,
- focused commits and synchronized documentation.

Tools are introduced and configured when the corresponding development step requires them; listing a tool in the standard does not imply that it has already been installed or configured.

### Rationale

A concise, explicit coding standard provides consistent professional practices without adding unnecessary tooling or process. Keeping detailed standards in a dedicated document prevents `AGENTS.md` and `docs/DEVELOPMENT.md` from becoming overloaded with style rules.

### Consequences

- Contributors and AI agents should follow `docs/CODING_STANDARDS.md`.
- Changes to coding conventions should be made deliberately and reflected in that document.
- New tooling should still be justified and introduced incrementally.

---

## D-026 — Alembic for Database Migrations

**Status:** Accepted  
**Date:** 2026-09-11

Alembic is used for versioning and applying database schema changes. SQLAlchemy models define the application's database structure, while Alembic migration revisions record and apply transitions between schema versions.

### Rationale

The coin catalogue database will evolve as new fields, relationships, and features are introduced. Versioned migrations provide a reproducible and reviewable way to create and change the database schema while preserving existing application data.

Alembic integrates directly with SQLAlchemy and fits the project's Git-based development workflow.

### Consequences

- Migration revisions are stored under `backend/migrations/versions/`.
- Database schema changes must be represented by migration revisions.
- Alembic's autogeneration may be used as a starting point, but generated migrations must be reviewed before being applied.
- Database migration state is separate from application/coin data.

---

## D-027 — Singular Database Table Names

**Status:** Accepted  
**Date:** 2026-09-14

Database table names use the singular form. The initial domain tables are:

```text
coin
country
issuer
denomination
mint
material
state
era
```

SQLAlchemy model class names use the corresponding singular PascalCase form, for example `Coin`, `Country`, and `Issuer`.

### Rationale

The project owner selected singular table names as the preferred naming convention for consistency between database tables and their corresponding domain models.

### Consequences

- New database tables should use singular names unless a later decision supersedes this convention.
- Foreign-key columns follow the corresponding singular entity name, for example `country_id`, `issuer_id`, and `state_id`.

---

## D-028 — Initial Coin Schema

**Status:** Accepted  
**Date:** 2026-09-14

The initial database schema models one `coin` row as one concrete physical coin in the collection. Multiple physically identical coins may therefore have separate `coin` rows.

The `coin` table contains:

```text
id
country_id
issuer_id
denomination_id
from_year
from_era_id
to_year
to_era_id
mint_id
material_id
state_id
description
weight
diameter
has_video
source
created_at
updated_at
```

Reference tables are:

```text
country
issuer
denomination
mint
material
state
era
```

All reference tables contain `id` and a unique, non-null `name`.

`currency` is intentionally not part of the initial schema. `denomination` is the field used to identify the specific denomination of a coin; a separate currency field is not required for the initial catalogue.

The date range is represented by `from_year`/`from_era_id` and `to_year`/`to_era_id`. A single-year coin uses the same value for both endpoints. No database range constraints are imposed on the year values.

`weight` is stored as `NUMERIC` in grams and `diameter` as `NUMERIC` in millimetres. Units are not stored separately.

`has_video` is a non-null boolean with a default of `FALSE`. Direct video URLs are not stored at this stage.

`source` is a single optional `TEXT` field that may contain a URL or free text.

`created_at` and `updated_at` are required UTC timestamps. `updated_at` changes when the record is updated.

Optional coin metadata may be `NULL`; unknown values are not represented by artificial `Unknown` dictionary rows.

### Rationale

The schema is intentionally small while covering the information currently available in the collection. Separate reference tables provide consistent reusable values without introducing speculative attributes. Removing `currency` avoids duplicating or ambiguously defining monetary-system information that is not currently needed.

### Consequences

- The initial Alembic migration creates the schema described above.
- Future schema changes must use new Alembic migration revisions.
- Additional fields or reference entities require an explicit design decision when a real requirement appears.

---

## D-029 — Soft Delete for Coins

**Status:** Accepted  
**Date:** 2026-09-14

Coins are never permanently deleted through normal application functionality.

The `coin` table contains:

```text
is_deleted
```

The field is a non-null boolean with a default value of `FALSE`.

Semantics:

- `FALSE` — active coin
- `TRUE` — deleted/archived coin

Normal coin-list operations return active coins only unless a future feature explicitly requests deleted coins.

The application uses archival operations rather than permanent deletion:

```text
POST /api/coins/{id}/archive
POST /api/coins/{id}/restore
```

A future UI delete action therefore archives the coin by setting `is_deleted = TRUE`.

Permanent database deletion of coins is not part of the normal application workflow.

### Rationale

The catalogue represents physical collection data. Accidental deletion should therefore be reversible, while the database should retain the historical record.

### Consequences

- New coins are created with `is_deleted = FALSE`.
- Normal coin browsing excludes deleted coins.
- Archive and restore are explicit operations.
- No normal application endpoint performs a hard `DELETE` on a coin.
- Future UI work must preserve this behavior.

---

## D-030 — Coin Image Storage, Naming, and Editing Workflow

**Status:** Accepted  
**Date:** 2026-09-14

Original coin photographs are stored as external JPG files in a top-level `images/` directory at the same repository level as `data/`. The `images/` directory is ignored by Git and is not version-controlled.

All image files are stored directly inside `images/`; separate per-coin subdirectories are not used.

A coin ID is represented in image filenames as exactly six decimal digits with leading zeroes. For example, coin ID `404` is represented as `000404`.

The required filenames are:

```text
000404 - awers.jpg
000404 - rewers.jpg
000404 - 01.jpg
000404 - 02.jpg
000404 - 03.jpg
```

Each coin must have one current `awers` image and one current `rewers` image when changes are saved. Additional images may be present without a fixed limit and are numbered sequentially as `01`, `02`, `03`, and so on. Additional images cover cases such as slab photographs, rim photographs, or additional views.

Avers and rewers may be removed or replaced during editing, but a coin cannot be saved while either required image is missing. Replacing an image therefore means assigning another image of the same required type before saving the changes.

The application database stores image metadata and references separately from the image file contents. Image files are never stored as SQLite BLOBs.

Coin images are added and replaced as part of the normal manual coin creation and editing workflow. There is no separate image-import workflow for bulk importing coins or photographs.

In coin-edit mode, the frontend provides drag-and-drop areas for the `awers` and `rewers` images and a drag-and-drop area/list for additional images. A dropped image on `awers` or `rewers` adds the image if missing or replaces the current image of that type. Dropped images in the additional-images area are added as additional images.

The same image-assignment workflow must support pasting an image from the clipboard, including images copied from a web browser. The active image area determines whether the pasted image becomes or replaces the `awers`, becomes or replaces the `rewers`, or is added as an additional image.

The workflow should not require a separate generic `Dodaj zdjęcie` button for normal image entry.

The application must never silently overwrite an existing image file. When an operation would replace an existing target image, the user must explicitly confirm the replacement before the file is overwritten.

### Rationale

The collection already contains rectangular JPG photographs that are close to square, and the browser grid is therefore designed around square image cells. Direct flat storage in `images/` keeps the file collection simple and predictable; the six-digit coin ID provides stable lexical sorting and grouping without requiring per-coin directories.

Requiring an awers and rewers at save time reflects the domain model: both sides are essential primary photographs of a coin. Allowing temporary removal during editing makes replacement practical without permitting an incomplete saved coin.

Integrating drag-and-drop and clipboard paste into the coin editing workflow keeps manual entry fast and avoids unnecessary generic upload controls.

Keeping image metadata in SQLite while retaining the actual JPG files on disk separates structured catalogue data from potentially large binary files and leaves room for future image metadata, serving, and thumbnail features.

### Consequences

- The repository uses a top-level `images/` directory alongside `data/` for application image data.
- Git must ignore `/images/`.
- Image filenames use the six-digit coin ID and the approved suffix format.
- A saved coin has one current primary obverse image and one current primary reverse image.
- Additional images are represented as sequential numbered files for the same coin.
- Coin creation and editing, rather than a separate import tool, are the source of image assignment.
- Future image-management implementation must support drag-and-drop and clipboard paste and must preserve the no-silent-overwrite rule.

---

## D-031 — Flexible Many-to-Many Category Graph

**Status:** Accepted  
**Date:** 2026-09-14

The catalogue uses user-defined categories as a flexible classification system separate from the fixed domain dictionaries such as country, issuer, denomination, material, and era.

Categories are represented by a `category` entity and explicit parent-child relationships. The category hierarchy is not a single tree. A category may have multiple parents and multiple children, allowing a directed acyclic graph (DAG) instead of a strict one-parent hierarchy.

The conceptual schema is:

```text
category
--------
id
name
description
created_at
updated_at
```

```text
category_relation
-----------------
parent_id
child_id
```

A category may therefore participate in structures such as:

```text
A → B
A → C
B → D
C → D
```

where `D` has more than one parent.

Category relationships must remain acyclic. A category cannot be its own ancestor through any chain of parent-child relationships.

Coins are related to categories through a many-to-many association:

```text
coin_category
-------------
coin_id
category_id
```

A single coin may therefore belong to multiple categories, and a single category may contain multiple coins.

Categories are not used as replacements for fixed descriptive fields. A country remains a country, material remains a material, and so on; categories provide an additional user-defined classification layer.

### Rationale

A strict tree would force every category to have at most one parent and would make it difficult to express overlapping classifications. A many-to-many category graph allows the project owner to build and evolve several related classification schemes without restructuring the database when a category belongs naturally in more than one place.

Separating categories from fixed dictionaries keeps the semantic meaning of those dictionaries stable while allowing the user-defined classification layer to remain intentionally flexible.

### Consequences

- Category data requires a dedicated model and database tables.
- Category-to-category relations are many-to-many and must be validated to prevent cycles.
- Coin-to-category assignment is many-to-many.
- Future category UI should allow creating, editing, connecting, and browsing parent-child relationships.
- Future implementation should preserve the distinction between categories and fixed domain dictionaries.

---

## D-032 — Optional Collection Number

**Status:** Accepted  
**Date:** 2026-09-15

Each coin may have an optional collection number used as a user-defined identifier within the personal collection.

The `coin` table contains:

```text
collection_number
```

The field is nullable and stored as `TEXT`. It is not the database primary key and does not replace the internal numeric coin ID.

The collection number is exposed consistently through the coin create, update, and response schemas. It can be entered and edited in the frontend and is displayed in the coin grid, list, and detail views when present.

The collection number is also included in coin text search.

### Rationale

A collection number is a practical human-facing identifier that may follow a numbering scheme defined by the collection owner. Storing it as text preserves formats that may contain prefixes, separators, or leading zeroes and avoids imposing an application-defined numbering scheme.

Keeping the collection number separate from the internal database ID preserves the database identity of the coin while allowing the collection owner to use a meaningful external identifier.

### Consequences

- Collection numbers are optional and may be `NULL`.
- Collection numbers are stored as text rather than numeric values.
- Existing coins can remain without a collection number.
- The internal coin ID remains the database identity.
- Collection number changes are handled through the normal coin editing workflow.
- Future uniqueness or formatting rules for collection numbers would require a separate explicit decision.

---

## D-033 — Collections as a First-Class Entity

**Status:** Accepted  
**Date:** 2026-09-15

The catalogue uses collections as first-class database entities. One SQLite database stores all collections and all coins.

The conceptual relationship is:

```text
collection
-----------
id
name
description
created_at
updated_at

coin
-----------
id
collection_id → collection.id
collection_number
...
```

Each physical coin remains represented by exactly one `coin` row.

Each coin belongs to exactly one collection.

A collection has:

- a technical `id`;
- a required unique `name`;
- an optional `description`;
- `created_at`;
- `updated_at`.

Collection names must be unique.

Empty collections are allowed.

A collection containing coins cannot be deleted. Coins must first be moved to another collection. An empty collection may be deleted.

Existing coins are assigned to one default collection during migration, for example `Default Collection`.

Categories remain shared across all collections. Collections do not create separate category namespaces.

### Rationale

Collections represent an organizational boundary for groups of physical coins while preserving one shared catalogue database. Keeping the relationship directly on `coin` makes collection membership explicit without duplicating the coin schema or maintaining separate databases.

Shared categories allow the existing classification system to remain independent from collection membership.

### Consequences

- A new `collection` database table is required.
- `coin.collection_id` is required.
- Existing coin data requires migration to a default collection.
- Collection names require a database-level uniqueness rule.
- Empty collections are valid.
- Non-empty collections cannot be deleted through normal application functionality.
- Categories remain global and shared.

---

## D-034 — Collection-Aware Coin Images

**Status:** Accepted  
**Date:** 2026-09-15

Coin photographs remain external JPG files, but image storage becomes collection-aware.

The filesystem layout is:

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
        ├── 000001 - awers.jpg
        └── ...
```

Only one collection directory level is used. Per-coin subdirectories are not used.

Within a collection, the existing flat filename convention remains in effect.

All `coin_image` records associated with a coin belong to that coin and therefore move with the coin when the coin changes collection.

A `coin_image.filename` value must correspond to the actual filename on disk.

The image file must be located in the directory corresponding to the coin's current collection.

### Rationale

Collection-level directories separate image files belonging to different collections without introducing a large number of per-coin directories. The existing six-digit coin-ID naming convention remains useful within each collection.

### Consequences

- Image storage moves from a single flat `images/` directory to collection directories.
- Per-coin image directories are explicitly not used.
- Existing image filename conventions remain unchanged apart from their collection directory.
- Image-management code must resolve the collection through the coin relationship.
- Filesystem/database integrity must include collection-directory correctness.

---

## D-035 — Moving a Coin Creates a New Technical Coin ID

**Status:** Accepted  
**Date:** 2026-09-15

Moving a coin between collections creates a new `coin.id` in the target collection. The original technical coin ID is not preserved.

For example:

```text
source:
coin.id = 404
collection = Collection A

target:
coin.id = 731
collection = Collection B
```

The new technical ID is generated by SQLite using the normal `coin.id` mechanism. No separate ID generator is introduced.

The moved coin preserves its user-facing `collection_number`.

`collection_number` remains fully controlled manually by the user and is independent from the technical `coin.id`. Moving a coin does not automatically change or regenerate `collection_number`.

All associated `coin_image` records are recreated for the new coin ID, and the corresponding JPG files are renamed using the new technical ID.

A target filename must never overwrite an existing file. If the initially generated target ID would result in a collision, the operation must select another valid new SQL coin ID before finalizing the move.

The original coin record and original image files remain in place until the target record and target files have been successfully prepared.

The move is considered successful only when the new coin, its image metadata, and its image files are complete and consistent.

If the move cannot be completed safely, the operation must return the system to the exact pre-move state.

SQLite transaction management alone is insufficient because filesystem operations are outside the database transaction. The implementation therefore requires a deliberate database/filesystem operation with temporary files and compensating rollback.

### Rationale

The technical `coin.id` is a global database identity, while a move between collections represents creation of the coin's representation in another collection context. Generating a new SQL ID also provides a new, collision-free basis for the physical filenames.

Keeping `collection_number` unchanged preserves the user's own identifier independently of technical database identity.

### Consequences

- Coin moves cannot be implemented as a simple `UPDATE coin SET collection_id = ...`.
- The move operation must create a new technical coin record.
- Image filenames change when the technical ID changes.
- The old record and files must remain intact until the target state is ready.
- Rollback/compensation is a mandatory part of the move implementation.
- Real failure-injection tests are required for the move workflow.
