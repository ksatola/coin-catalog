# Project Roadmap

This roadmap defines the planned development path for the coin catalogue and is maintained against the verified implementation state.

## Development Principles

- Work incrementally in small, verifiable steps.
- Keep documentation synchronized with actual implementation.
- Prefer simple solutions over premature complexity.
- Avoid speculative functionality before it is needed.
- Review project documentation before each major phase.
- Do not treat a proposed change as accepted until explicitly reviewed and approved.

## Phase 1 — Development Environment

**Status:** Complete

Docker Dev Container, Python/uv, Node.js/Vue/Vite, host-browser access, and repository development workflow are established and verified.

## Phase 2 — Application Skeleton

**Status:** Complete

FastAPI, health endpoint, separate development servers, Vite `/api` proxy, and frontend-to-backend development flow are established and verified.

## Phase 3 — Database Foundation

**Status:** Complete

SQLite, SQLAlchemy, Alembic, the initial coin/reference schema, database behavior tests, and the accepted core coin data model are established and verified.

## Phase 4 — Coin Entry and Browser

**Status:** Complete

The first usable catalogue workflow is implemented and verified, including coin CRUD/archive/restore, dictionaries, browser views, images, categories, coin-category assignment, and cross-era date ranges.

## Historical Scope Adjustment

Image management, the full coin browser, editing, category management, and coin-category assignment were absorbed into Phase 4 where required by the usable workflow. Broader collection/tag organization remains future work.

## Phase 5 — Search and Filtering

**Status:** Complete

Search, dictionary/era/year/media/status/category filters, recursive category filtering, deterministic sorting, duplicate-result protection, reset behavior, and Playwright coverage are implemented and verified.

## Phase 6 — UI Foundation and Visual System

**Status:** Complete

The application layout, shared visual foundation, catalogue presentation modes, responsive gallery, image viewer, redesigned forms and management interfaces, and corresponding Playwright coverage are implemented and verified.

The original Phase 6 image-management focus was reduced because initial image management was already implemented in Phase 4. Further image-management extensions remain optional future work.

## Phase 7 — Collection Number

**Status:** Complete

The collection number is an optional user-facing text value independent from the technical database ID.

Implemented and verified:

- database field and Alembic migration;
- API/model/schema support;
- creation and editing;
- catalogue display;
- search support;
- backend automated coverage;
- Playwright create/edit coverage;
- catalogue scroll-position preservation during search refreshes.

The collection number has no uniqueness rule or restrictive format at this stage.

## Phase 8 — Collections

**Status:** Complete

Implemented and verified functionality covers the collection domain/database, collection API, collection-aware coin operations, collection filtering/search, collection-aware filesystem, atomic coin move, and the collection frontend. The current development cycle verified the Phase 8 Playwright suites, image-storage tests, and backend Ruff checks recorded in docs/PROGRESS.md. Collection creation prepares its filesystem directory, the catalog shows active collection scope, and the collection management view exposes detail navigation.

Phase 8 introduced collections as a first-class organizational entity while keeping one shared SQLite database.

Implemented scope:

1. Collection domain and database
   - `collection` model and table;
   - `coin.collection_id`;
   - collection uniqueness and deletion rules;
   - migration of existing coins to a default collection.

2. Collection API
   - collection CRUD;
   - validation;
   - collection-aware coin operations.

3. Collection-aware coin CRUD
   - collection selection during creation;
   - collection selection during editing;
   - collection management from the UI.

4. Collection filtering and search
   - one selected collection;
   - multiple selected collections;
   - all collections;
   - no collection restriction;
   - combinations with existing search and filters.

5. Collection-aware filesystem
   - creating a collection creates its required `collection-XXX/` directory;
   - `images/collection-001/`;
   - flat files within each collection;
   - no per-coin directories;
   - migration/compatibility for existing image files.

6. Atomic coin move
   - new SQL `coin.id`;
   - preservation of `collection_number`;
   - image copy/rename;
   - target collision handling;
   - database/filesystem coordination;
   - rollback and compensation.

7. Frontend
   - collection management;
   - collection selector;
   - multi-collection search;
   - coin move workflow.

8. Verification
   - backend collection tests;
   - search/filter tests;
   - filesystem consistency tests;
   - move/collision tests;
   - injected-failure rollback tests;
   - Playwright coverage.

## Phase 9 — Coin Browser Optimization

**Status:** Future / conditional

The basic browser is already implemented. Pagination or other large-collection optimization should be introduced only if actual collection size or performance requirements justify it.

## Phase 10 — Backup and Export

**Status:** Not started

Planned: database/image backup strategy, metadata export, and full catalogue export evaluation.

## Phase 11 — Testing and Quality

**Status:** Ongoing

Backend and Playwright automation exists. Broader integration coverage, CI checks, and additional quality automation remain future work.

## Phase 12 — Packaging and Deployment

**Status:** Not started

Planned: supported deployment model, production runtime, deployment documentation, backup/recovery documentation, and supported-host verification.

## Future / Optional Areas

Possible future extensions include OCR, automated image analysis, numismatic image recognition, price/value tracking, market data integration, advanced statistics/reporting, advanced collection analytics, additional import/export formats, mobile-oriented interface, multi-user support, authentication/authorization, and external catalogue integrations.

These are not committed until justified by actual requirements.

## Documentation Review Before Each Major Phase

Before each major phase, review:

1. `AGENTS.md`;
2. `docs/ARCHITECTURE.md`;
3. `docs/DECISIONS.md`;
4. `docs/PROGRESS.md`;
5. `docs/ROADMAP.md`.

If the review reveals a direction or architecture change, stop before implementation and discuss it explicitly.

## Roadmap Maintenance

When the project evolves:

- update `docs/PROGRESS.md` with verified implementation status;
- update this roadmap when sequence or scope changes;
- record significant architectural decisions in `docs/DECISIONS.md` after explicit approval;
- update `docs/ARCHITECTURE.md` when technical architecture changes;
- keep documentation changes close to the implementation changes they describe.
