# Project Roadmap

## Purpose

This roadmap defines the planned development path for the coin catalogue and is maintained against the verified implementation state.

A roadmap item is not, by itself, an architectural commitment. Significant architectural decisions are explicitly accepted and recorded in `docs/DECISIONS.md`.

## Development Principles

- Work incrementally in small, verifiable steps.
- Keep documentation synchronized with actual implementation.
- Prefer simple solutions over premature complexity.
- Avoid speculative functionality before it is needed.
- Review the project documentation before each major phase.
- Do not treat a proposed change as accepted until it has been explicitly reviewed and approved.

## Phase 1 — Development Environment

**Status:** Complete

Established the Docker Dev Container, Python/uv environment, Node.js/Vue/Vite environment, host-browser access, and repository development workflow.

## Phase 2 — Application Skeleton

**Status:** Complete

Established the FastAPI application, health endpoint, separate development servers, Vite `/api` proxy, and verified frontend-to-backend development flow.

## Phase 3 — Database Foundation

**Status:** Complete

Established SQLite, SQLAlchemy, Alembic, the initial coin/reference schema, database behavior tests, and the accepted core coin data model.

## Phase 4 — Coin Entry and Browser

**Status:** Complete

Phase 4 has grown into the first usable catalogue slice and now includes functionality originally planned for later phases because it was required to make the workflow useful and verifiable.

Implemented:

- coin creation, retrieval, update, archive, and restore;
- soft deletion for archived coins;
- seven reference dictionaries with CRUD UI/API;
- dictionary-reference deletion protection;
- coin entry form with dictionary-backed selectors;
- Grid and List coin browsing;
- coin details;
- editing;
- fixed bottom navigation;
- coin image association and serving;
- primary awers/rewers image replacement;
- additional image upload/deletion;
- accepted external-file image storage convention;
- category data structures and backend category APIs;
- category management UI and parent/child relation management;
- cycle prevention and category deletion protection;
- coin-category assignment/removal UI;
- Playwright UI coverage for coin/image and category workflows;
- cross-era date-range behavior where numeric years are not compared across BC/AD eras.

Final verification is complete: the backend tests passed with 62 tests, Ruff checks passed, the frontend production build passed, the coin/image Playwright suite passed with 5 tests, the category and coin-category suite passed with 15 tests, manual cross-era entry was verified, and the final local working tree was clean.

## Historical Scope Adjustment

The original roadmap placed image management, the full coin browser, and editing in later phases. During implementation these capabilities were pulled into Phase 4 because the first usable catalogue workflow required them.

Category management and coin-category assignment were also completed as part of Phase 4. The historical Phase 8 placeholder therefore no longer represents missing category-management UI; it remains only for broader collection/tag capabilities.

Those original phase numbers are retained below as historical roadmap placeholders rather than representing unimplemented work.

## Phase 5 — Search and Filtering

**Status:** Complete

Implemented and verified:

- tokenized text search across coin and related reference/category names;
- whitespace normalization and order-independent AND matching between search tokens;
- validation requiring at least 3 characters per search token in the UI;
- dictionary filters for country, issuer, denomination, mint, material, state, and era;
- category filtering with optional recursive inclusion of subcategories;
- `Uwzględniaj podkategorie` enabled by default, with direct-category-only filtering when disabled;
- OR semantics within a selected filter type and AND semantics between different filter types;
- year-range overlap filtering;
- image and video presence filters;
- active, archived, and all coin-status filtering;
- deterministic sorting by ID and coin date fields with ID tie-breaking;
- backend query construction using correlated `EXISTS` conditions and recursive category traversal;
- duplicate-result protection in the coin query;
- Playwright coverage for the search/filtering UI.

Final local validation passed: backend pytest, Ruff lint, Ruff format check, frontend production build, and the full Playwright UI suite.

Phase 5 is therefore complete.

## Phase 6 — UI Foundation and Visual System

**Status:** Planned

The goal of this phase is to establish a consistent UI foundation for the continued development of Coin Catalog.

Planned scope:

- consistent application layout and main navigation structure;
- a basic visual system covering typography, spacing, columns, forms, buttons, messages, and UI states;
- a small set of reusable Vue components;
- visual consistency across existing application screens;
- improved responsiveness and usability;
- preservation of existing backend and API behavior;
- automated and manual verification of affected UI workflows.

This phase does not introduce new domain functionality, database-model changes, or API changes unless separately proposed and explicitly approved.

### Historical Scope Adjustment

The original Phase 6 scope focused on image management. The initial image-management capability was implemented during Phase 4 because it was required by the first usable catalogue workflow. Further image-management extensions remain optional future work and are not the focus of the current Phase 6.

## Phase 7 — Coin Browser

**Status:** Partially absorbed into Phase 4

The basic Grid/List browser, details, active/archived views, and navigation are implemented. Pagination or other large-collection optimization remains future work if required.

## Phase 8 — Collections, Categories and Tags

**Status:** Partially absorbed into Phase 4 / future expansion

The category data model, backend APIs, category-management UI, parent/child relations, cycle prevention, deletion protection, and coin-category assignment/removal are implemented. Broader collection/tag organization and related filtering remain future work.

## Phase 9 — Editing and Data Management

**Status:** Partially absorbed into Phase 4

Coin metadata editing is implemented. Future work may extend editing to additional organization and collection-management features.

## Phase 10 — Backup and Export

**Status:** Not started

Planned work:

- define backup strategy;
- define database backup process;
- define image backup process;
- evaluate metadata export;
- evaluate full catalogue export.

## Phase 11 — Testing and Quality

**Status:** In progress as an ongoing concern

Automated backend and Playwright UI testing already exists. Future work includes broader integration coverage, CI checks, and additional quality automation.

## Phase 12 — Packaging and Deployment

**Status:** Not started

Planned work:

- define supported deployment model;
- prepare production runtime;
- document deployment;
- document backup and recovery;
- verify supported host platforms.

## Future / Optional Areas

Possible future extensions include:

- OCR;
- automated image analysis;
- numismatic image recognition;
- price/value tracking;
- market data integration;
- advanced statistics and reporting;
- advanced collection analytics;
- additional import/export formats;
- mobile-oriented interface;
- multi-user support;
- authentication and authorization;
- external catalogue integrations.

These are not committed until justified by actual requirements.

## Documentation Review Before Each Major Phase

Before each major phase, review:

1. `AGENTS.md`;
2. `docs/ARCHITECTURE.md`;
3. `docs/DECISIONS.md`;
4. `docs/PROGRESS.md`;
5. `docs/ROADMAP.md`.

If the review reveals a direction or architecture change, stop before implementation and discuss it explicitly. Once agreed, update the relevant documentation before proceeding.

## Roadmap Maintenance

When the project evolves:

- update `docs/PROGRESS.md` with verified implementation status;
- update this roadmap when sequence or scope changes;
- record significant architectural decisions in `docs/DECISIONS.md` after explicit approval;
- update `docs/ARCHITECTURE.md` when technical architecture changes;
- keep documentation changes close to the implementation changes they describe.
