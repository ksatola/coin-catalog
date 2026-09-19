# Cross-platform Standalone Packaging

## Status

**Planning document — not implemented.**

This is the durable planning source for Phase 9. It describes the intended product, verification strategy, open technical questions, and release workflow. It does not by itself establish an accepted architectural decision.

## Goal

Deliver standalone Windows and macOS distributions that a normal user can run without Python, Node.js, uv, Docker, VS Code, Dev Containers, or project-specific runtime dependencies.

The product remains a desktop-local application whose UI is delivered through the user's browser.

## Target Platforms

- Windows 11
- macOS

Supported CPU architectures must be verified before release and stated in release artifacts.

## Development vs Standalone Runtime

Development may continue to use Docker, VS Code, Dev Containers, Python, uv, Node.js, Vite, and separate development servers.

Standalone runtime should package everything required to run the application.

Preferred runtime flow:

~~~text
Launcher
  |
  +-- establish application/data paths
  +-- start local FastAPI
  +-- wait for readiness
  +-- open default browser
          |
          v
     Vue production UI
          |
          v
     FastAPI API
       |       |
       v       v
    SQLite   image files
~~~

Vue should be built into production static assets and served by FastAPI. The exact launcher/process model remains open until verified.

## User Data Boundary

The executable or .app bundle must not be the user's data directory.

Mutable data should live outside the replaceable application bundle, including:

- SQLite database;
- collection-aware images;
- future generated user data;
- logs/diagnostics if introduced.

Current image convention:

~~~text
data/images/collection-001/
data/images/collection-002/
...
~~~

The exact Windows and macOS base data locations must be selected and documented according to platform conventions.

## Database and Migrations

SQLite and Alembic remain the current accepted database/migration technologies.

Standalone startup should:

1. locate the existing database;
2. determine its schema revision;
3. run approved migrations when required;
4. fail safely with a useful diagnostic if migration fails;
5. start only when the database is usable.

The application must not silently create a new empty database when an existing user database is present at the expected location.

Upgrade testing must use data created by an earlier supported application version.

## Startup, Shutdown, and Local HTTP

The launcher should establish paths, start FastAPI, wait for readiness, open the browser, keep the backend alive, and shut it down cleanly.

The local HTTP strategy must be deliberate:

- bind to localhost;
- avoid assuming a preferred port is always free;
- define deterministic or controlled fallback behavior;
- make startup failures understandable to non-technical users.

Port selection and launcher behavior are proposals to verify, not accepted decisions.

## Proposed Tech Stack — To Be Verified

The existing application stack is accepted:

| Area | Technology | Status |
|---|---|---|
| Backend | Python + FastAPI | Existing / accepted |
| Database | SQLite | Existing / accepted |
| ORM | SQLAlchemy | Existing / accepted |
| Migrations | Alembic | Existing / accepted |
| Frontend | Vue 3 + TypeScript + Vite | Existing / accepted |
| Windows packaging | Python application packager, e.g. PyInstaller or Nuitka | Proposal — verify |
| macOS packaging | Native .app bundle from selected toolchain | Proposal — verify |
| Launcher | Packaged launcher/process mechanism | Proposal — verify |
| Build automation | Repository scripts; CI later | Proposal — verify |
| Versioning | Semantic Versioning + Git tags | Proposal — verify |
| Checksums | SHA-256 | Proposal — verify |
| macOS signing/notarization | Apple signing and notarization workflow | Required area; exact implementation to verify |

Candidate packaging tools must be compared using:

- Windows/macOS support;
- Python dependency compatibility;
- native extension handling;
- resource/static-file inclusion;
- subprocess behavior;
- SQLite/filesystem behavior;
- startup time;
- diagnostics;
- reproducibility;
- build isolation;
- licensing;
- maintenance status;
- signing/notarization compatibility;
- one-folder and single-file options.

The first implementation should optimize for diagnosability and reproducibility rather than minimum artifact size.

## Windows Distribution

Initial target: portable one-folder distribution.

~~~text
CoinCatalog/
  CoinCatalog.exe
  runtime/application files...
~~~

User data should not be stored in the replaceable application directory unless a deliberate portable-data mode is later introduced.

A single-file .exe can be evaluated only after the one-folder runtime is proven.

## macOS Distribution

Target: native .app bundle.

The implementation must address:

- bundle structure;
- bundled runtime/dependencies;
- resource paths;
- writable data paths;
- browser launch;
- lifecycle;
- supported architectures;
- code signing;
- notarization;
- Gatekeeper/trust;
- distribution format.

Intel vs Apple Silicon support must be decided from verified build and signing constraints.

## Security and Trust

The release design must address:

- localhost-only binding;
- filesystem permissions;
- untrusted input;
- executable signing;
- macOS notarization;
- Windows security/reputation warnings;
- dependency provenance;
- reproducible build inputs;
- checksums.

Unsigned builds may be used for development verification but are not equivalent to a final supported release.

## Versioning

Use Semantic Versioning:

~~~text
MAJOR.MINOR.PATCH
~~~

There should be one authoritative application version reflected consistently in application metadata, artifact names, Git tag, GitHub Release, release notes, and diagnostics.

Candidate tag convention:

~~~text
vX.Y.Z
~~~

The exact location of the authoritative version value remains an implementation decision.

## Reproducible Builds

Each release build should record:

- source commit;
- application version;
- target OS and architecture;
- Python version;
- uv version;
- Node.js version;
- lock-file state;
- packaging tool version;
- frontend build command;
- backend packaging command;
- relevant environment variables;
- artifact names;
- checksums.

The build must not depend on undeclared developer-machine files.

The project should distinguish source reproducibility, build-environment reproducibility, and byte-for-byte reproducibility. The initial acceptance target is a deterministic, documented build process.

## Native Build Environments

Do not assume that the Linux Dev Container can safely produce every final Windows and macOS artifact.

Verify the packaging toolchain per target. If native builds are required, document them explicitly.

Future CI may build Windows artifacts on Windows and macOS artifacts on macOS.

## Build Scripts

The repository should eventually expose an explicit workflow:

~~~text
build frontend
-> package backend + frontend
-> assemble platform distribution
-> run automated checks
-> create release artifact
-> calculate checksum
~~~

Exact script names are intentionally open.

A local Dev Container script may be useful later, but it should orchestrate a documented process rather than hide important decisions.

## Release Verification

A successful packaging command is not sufficient.

### Source-level

- backend tests;
- Ruff check/format verification;
- Pyright where applicable;
- frontend production build;
- relevant Playwright/UI tests.

### Package-level

Verify that the final artifact:

- exists and contains expected files;
- starts and reaches readiness;
- opens the browser;
- loads the Vue UI;
- serves the API;
- opens SQLite;
- reads/writes images;
- respects collection-aware paths;
- supports collection operations;
- shuts down cleanly.

### Clean-machine

Use at least one clean supported Windows environment and one clean supported macOS environment before a supported cross-platform release.

### Upgrade

At minimum:

1. run version A;
2. create realistic user data;
3. close the application;
4. install/replace with version B;
5. run migrations if required;
6. verify database contents;
7. verify images and collections;
8. verify normal operation.

## Data Safety and Backup

Application updates must not delete user data.

Release documentation must state where user data lives.

Before migrations that can materially alter data, provide an appropriate backup recommendation.

## Release Artifacts and User Notes

A supported release should eventually contain:

- platform-specific application artifact(s);
- SHA-256 checksum file;
- user-facing release notes;
- version;
- supported platform/architecture information;
- startup/installation instructions;
- upgrade/data-safety notes.

Candidate checksum file:

~~~text
SHA256SUMS.txt
~~~

User-facing notes should live under:

~~~text
docs/releases/vX.Y.Z.md
~~~

They should describe changes, fixes, compatibility, upgrade/data notes, and known limitations.

## AI-Agent Release Workflow

The repository should contain enough durable information for a future AI agent to reproduce releases without conversation history.

The intended workflow is:

1. inspect AGENTS.md;
2. inspect ARCHITECTURE.md, DECISIONS.md, PROGRESS.md, ROADMAP.md;
3. inspect this document;
4. determine the current application version;
5. inspect Git state;
6. determine the requested release version;
7. verify version/release rules;
8. build required artifacts;
9. run documented verification;
10. test final packages;
11. generate checksums;
12. prepare release notes;
13. show complete proposed repository changes;
14. obtain explicit approval before repository writes;
15. publish/tag/release according to the documented workflow;
16. verify final repository and release state.

The agent must distinguish planning, proposed changes, build output, verified tests, and published release.

## Suggested Repository Layout

Planning example only:

~~~text
docs/
  CROSS_PLATFORM_STANDALONE_PACKAGING.md
  releases/
    vX.Y.Z.md

scripts/
  build-standalone...
  verify-standalone...
  release...
~~~

Exact filenames are to be selected after the packaging toolchain is verified.

## Implementation Stages

### Stage A — Windows proof of concept

Prove packaging, production Vue assets served by packaged FastAPI, SQLite/images outside the Dev Container, startup, and browser launch.

### Stage B — Windows release candidate

Add stable data paths, migrations, versioning, clean-machine tests, upgrade tests, artifacts, checksums, and release notes.

### Stage C — macOS proof of concept

Prove .app packaging, paths, browser launch, SQLite/images, supported architecture, signing/notarization feasibility.

### Stage D — macOS release candidate

Add clean-machine tests, upgrade tests, signing/notarization, release metadata, and documented distribution.

### Stage E — Unified cross-platform release

Use one product/version/release model with platform-specific build steps where necessary.

### Stage F — Automation

Only after the manual release process is proven should CI/CD automation be introduced.

## Non-goals

Phase 9 does not automatically include:

- mobile applications;
- native rewrites of Vue or FastAPI;
- cloud hosting;
- multi-user server deployment;
- authentication redesign;
- automatic cloud backup;
- device synchronization;
- a full installer/updater unless later justified.

## Definition of Done

Phase 9 is complete only when:

- Windows standalone distribution works on a clean supported Windows environment;
- macOS standalone distribution works on a clean supported macOS environment;
- target machines need none of Python, Node.js, uv, Docker, or Dev Container;
- production Vue assets are served correctly;
- FastAPI starts and shuts down correctly;
- browser launch works;
- existing SQLite data remains usable;
- migrations are handled safely;
- collection-aware image storage works;
- user data is outside the replaceable application bundle;
- upgrade testing demonstrates data preservation;
- versioning is authoritative and consistent;
- release builds use documented, reproducible inputs;
- checksums are generated;
- user-facing release notes exist;
- supported platforms/architectures are documented;
- signing/notarization requirements are addressed for supported releases;
- a future AI agent can reproduce the documented release process;
- permanent technical choices are recorded in docs/DECISIONS.md.

## Open Decisions

Before implementation, verify and explicitly decide:

1. packaging tool;
2. one-folder vs single-file strategy;
3. Windows data location;
4. macOS data location;
5. local port strategy;
6. supported CPU architectures;
7. native build environments;
8. signing/notarization workflow;
9. repository build scripts;
10. CI provider/workflow;
11. authoritative version location;
12. GitHub Release process;
13. whether an installer/updater is needed.

These decisions must be based on repository constraints, toolchain tests, and release verification rather than assumptions.

## Relationship to Other Documentation

This document is the Phase 9 planning source.

When implementation begins:

- ARCHITECTURE.md describes only accepted architecture;
- DECISIONS.md records accepted packaging decisions;
- PROGRESS.md records verified implementation/test results;
- ROADMAP.md reflects current phase status;
- AGENTS.md contains durable AI/repository rules;
- this document records and updates planning assumptions as they are verified or rejected.
