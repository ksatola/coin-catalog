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

Established the Docker Dev Container, Python/uv environment, Node.js/Vue/Vite environment, host-browser access, and repository development workflow.

## Phase 2 — Application Skeleton

**Status:** Complete

Established the FastAPI application, health endpoint, separate development servers, Vite `/api` proxy, and verified frontend-to-backend development flow.

## Phase 3 — Database Foundation

**Status:** Complete

Established SQLite, SQLAlchemy, Alembic, the initial coin/reference schema, database behavior tests, and the accepted core coin data model.

## Phase 4 — Coin Entry and Browser

**Status:** Complete

Phase 4 grew into the first usable catalogue slice and absorbed functionality originally planned for later phases where it was required by the usable workflow.

Implemented and verified:

- coin creation, retrieval, update, archive, and restore;
- soft deletion and active/archived separation;
- seven reference dictionaries with CRUD UI/API and deletion protection;
- dictionary-backed coin entry and editing;
- Grid/List browser, details, navigation and archive/restore actions;
- coin image association, serving, primary-image replacement, and additional image management;
- category data structures, APIs, management UI, parent/child relations, cycle prevention, and deletion protection;
- coin-category assignment/removal;
- cross-era date-range behavior.

The final Phase 4 verification included backend tests, Ruff checks, frontend production build, Playwright coin/image and category coverage, manual cross-era entry, and a clean working tree.

## Historical Scope Adjustment

The original roadmap placed image management, the full coin browser, and editing in later phases. These capabilities were pulled into Phase 4 because the first usable catalogue workflow required them.

Category management and coin-category assignment were also completed as part of Phase 4. The historical Phase 8 placeholder therefore represents only broader collection/tag capabilities.

## Phase 5 — Search and Filtering

**Status:** Complete

Implemented and verified:

- tokenized text search with normalized whitespace and order-independent AND matching;
- search across coin fields, related reference/category names, descriptions, sources, eras, and years;
- dictionary, era, year-range, image, video, status, and category filters;
- recursive category filtering with optional subcategory inclusion;
- OR semantics within filter types and AND semantics between different filter types;
- deterministic sorting with ID tie-breaking;
- duplicate-result protection;
- user-facing search/filter workflow and reset behavior;
- Playwright coverage.

Final local validation passed: backend pytest, Ruff lint, Ruff format check, frontend production build, and the full Playwright UI suite.

## Phase 6 — UI Foundation and Visual System

**Status:** Implemented; final verification pending

Implemented:

- consistent application layout and main navigation;
- shared visual foundation for typography, spacing, cards, forms, buttons, messages, focus states, and responsive layouts;
- reusable catalogue presentation components;
- shared active/archive catalogue view structure;
- Gallery, Grid, and List presentation modes;
- persistent view-mode and gallery-column preferences using localStorage;
- responsive coin image gallery with configurable column count;
- consistent coin information presentation across Grid, List, and Detail;
- image viewer with keyboard navigation;
- redesigned coin creation and editing interfaces;
- preserved inline dictionary and category creation workflows;
- redesigned category and dictionary management interfaces;
- updated Playwright UI tests to match the implemented UI;
- automated coverage for the coin image viewer.

Phase 6 does not introduce new domain functionality, database-model changes, or API changes.

The latest verified Playwright result before the final inline-category fix was **39 passed, 1 failed**. The remaining failure was addressed in the inline category creation flow, but the resulting test run has not yet been independently verified.

### Historical Scope Adjustment

The original Phase 6 scope focused on image management. Initial image-management capability was implemented during Phase 4. Further image-management extensions remain optional future work.

## Next Step — Collection Number

**Status:** Planned

After final verification of Phase 6, introduce a dedicated collection number for each coin.

The collection number will be a user-facing text value independent from the technical database ID.

Planned work:

- add the collection-number field to the coin data model;
- define semantics, allowed format, and uniqueness rules;
- add the field to the backend API and validation;
- add collection-number input to creation and editing;
- include the collection number in coin search;
- display both technical ID and collection number where appropriate;
- preserve the technical database ID separately;
- add the database migration;
- add automated backend and UI tests.

This work will use a separate feature branch.

## Phase 7 — Coin Browser

**Status:** Partially absorbed into Phase 4

The basic Grid/List browser, details, active/archived views, and navigation are implemented. Pagination or other large-collection optimization remains future work if required.

## Phase 8 — Collections, Categories and Tags

**Status:** Partially absorbed into Phase 4 / future expansion

The category data model, backend APIs, management UI, parent/child relations, cycle prevention, deletion protection, and coin-category assignment/removal are implemented. Broader collection/tag organization remains future work.

## Phase 9 — Editing and Data Management

**Status:** Partially absorbed into Phase 4

Coin metadata editing is implemented. Future work may extend editing to additional organization and collection-management features.

## Phase 10 — Backup and Export

**Status:** Not started

Planned: database/image backup strategy, metadata export, and full catalogue export evaluation.

## Phase 11 — Testing and Quality

**Status:** In progress as an ongoing concern

Automated backend and Playwright UI testing exists. Broader integration coverage, CI checks, and additional quality automation remain future work.

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
