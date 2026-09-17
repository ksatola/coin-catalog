# Collections

This document is the canonical functional specification for Collections in Phase 8. It reconciles the earlier collection notes with the accepted architecture decisions and the current implementation direction.

## 1. Domain Model

The application uses one shared SQLite database for all collections and coins.

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

Rules:

- one `coin` row represents one physical coin;
- every coin belongs to exactly one collection;
- collection names are unique;
- empty collections are allowed;
- a collection containing coins cannot be deleted;
- categories are global and shared across all collections;
- `collection_number` is an optional, user-controlled value independent of technical `coin.id`;
- existing coins are assigned to a default collection during migration.

## 2. Collection UI

Collections are a first-class UI concept, not merely a technical coin attribute.

### Navigation

- Collections are available in the main navigation at the same level as Categories.
- The collection list is the central management view.
- Collection entries provide a clear `Pokaż` action.
- `Pokaż` navigates to `/kolekcje/:id`.
- A collection name shown on coin detail is a read-only navigation link to `/kolekcje/:id`.

### Collection list / management

The collection view provides:

- collection listing;
- collection creation;
- collection editing;
- deletion of empty collections;
- persisted collection statistics;
- navigation to the coins belonging to a collection.

Creating a collection must also create its filesystem directory. The application must not normally leave a successfully created collection without its required directory.

### Collection detail

`/kolekcje/:id` is a collection dashboard, not a second implementation of the coin catalogue.

It should present:

- collection name;
- description;
- persisted statistics;
- last modification information;
- a `Pokaż monety` action.

`Pokaż monety` opens the central coin catalogue with the collection selected, for example:

```text
/monety?collection_id=1
```

The detail view may show a concise collection-specific coin summary/list, but filtering, search, view modes and general coin browsing remain responsibilities of the central catalogue.

## 3. Coin Create and Edit

### Coin create

Creating a coin requires exactly one collection.

The form must:

- allow selecting an existing collection;
- allow creating a new collection inline without leaving the form;
- select the newly created collection for the coin.

### Coin edit

The coin edit page provides the full collection-assignment workflow.

The collection assignment block must appear in this order:

```text
Edytuj monetę

[ Kolekcja ]

[ Zdjęcia ]
```

Specifically:

- below the `Edytuj monetę` page header;
- above the `Zdjęcia` section;
- not above the page header;
- showing the current collection as selected;
- allowing selection of another existing collection;
- allowing inline creation and selection of a new collection.

Changing a coin's collection uses the domain move operation described in section 5. It is not a simple `collection_id` update.

### Coin detail

Coin detail is read-only with respect to collection assignment.

It shows:

```text
Kolekcja: Default Collection
```

The collection name links to `/kolekcje/:id`. The detail page does not change the collection and does not create collections.

## 4. Collection Filtering and Search

`Monety` and `Archiwum` use the same collection-filter concept.

The user can select:

- all collections;
- exactly one collection;
- multiple collections.

The UI should expose this as a multi-select collection filter, for example:

```text
Kolekcje:
[ Wszystkie kolekcje ▼ ]
```

with selections conceptually equivalent to:

```text
☑ Default Collection
☑ Collection 3
☐ Collection 2
```

The existing `collectionIds: number[]` model is the basis for this behavior.

### All collections

All collections are represented by an empty collection filter:

```text
collectionIds = []
```

No special collection ID represents "all".

### Selected collections

Examples:

```text
collectionIds = [1]
collectionIds = [1, 3]
collectionIds = [2, 3, 4]
```

The backend query uses repeated `collection_id` parameters and returns coins belonging to any selected collection.

### Quick search scope

Quick/free-text search always operates inside the currently selected collection scope.

Therefore:

```text
Wszystkie kolekcje + "polska grosz"
```

searches all collections, while:

```text
Default Collection + "polska grosz"
```

searches only that collection, and selecting two collections searches only those two.

The same rule applies to the archive.

### Visible context

The active collection scope must be visible in both `Monety` and `Archiwum`, so the user can always distinguish:

- all collections;
- one selected collection;
- multiple selected collections.

The application keeps one central coin catalogue. A collection selection is a filter/context, not a separate catalogue mode.

Coin lists should display collection information where it is useful for disambiguating results.

## 5. Moving a Coin Between Collections

Moving a coin between collections is an application-level move operation. It is **not** a simple:

```sql
UPDATE coin SET collection_id = ...
```

The accepted move semantics are:

1. create a new technical `coin.id` in the target collection using the normal SQLite ID mechanism;
2. copy the complete coin data to the new record;
3. preserve the user-facing `collection_number`;
4. recreate all associated `coin_image` records for the new coin ID;
5. copy/rename all associated JPG files into the target collection directory using the new technical ID;
6. protect against target filename collisions;
7. keep the source record and source files intact until the target state is complete;
8. remove the source record/files only after the target state is ready and the operation can be committed;
9. compensate/rollback all changes if the operation fails.

Example:

```text
collection-001
  coin id=404
  000404 - awers.jpg
  000404 - rewers.jpg

             │ MOVE
             ▼

collection-002
  coin id=731
  000731 - awers.jpg
  000731 - rewers.jpg
```

`collection_number` remains unchanged by the move unless the user explicitly edits it later.

The technical `coin.id` remains globally unique. No separate collection-specific ID generator is introduced.

### Atomicity requirement

SQLite transactions cover database state, but filesystem operations are outside the database transaction. Therefore a move must use temporary/staging files and a compensating rollback strategy so that a failed move does not leave an ambiguous DB/filesystem state.

The user-visible operation must be atomic: after completion the coin is either fully in the source state or fully in the target state.

## 6. Filesystem Layout

The collection-aware runtime layout is:

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

Rules:

- `data/images/` is the image root;
- there is exactly one collection directory level;
- per-coin directories are not used;
- filenames retain the existing six-digit technical coin-ID convention and image suffixes;
- `coin_image.filename` must match the actual filename on disk;
- every image file must reside in the directory corresponding to the coin's current collection.

The old flat top-level `/images/` layout is not the target architecture. It is legacy/source data that may require migration or explicit recovery handling.

## 7. Filesystem Lifecycle and Startup Consistency

The application owns the required runtime database/filesystem structure and must be able to prepare it from scratch.

At startup, an idempotent consistency/initialization step must ensure at minimum:

```text
data/
├── coin-catalog.db
└── images/
    ├── collection-001/
    ├── collection-002/
    └── ...
```

Required behavior:

- create `data/` when missing;
- initialize/create the database using the normal application database migration flow when the database file is missing;
- create `data/images/` when missing;
- create a missing `collection-XXX` directory for every collection present in the database;
- do not delete an orphan directory merely because it has no corresponding collection row;
- do not invent missing image files for `coin_image` rows;
- detect and report broken image references instead of silently fabricating data;
- make the consistency step safe to execute on every startup.

Automatic repair is non-destructive: it may create required structure, but it must not delete data based only on an inferred mismatch.

## 8. Integrity Invariant

For every `CoinImage` in a healthy runtime state:

```text
coin exists
image metadata exists
referenced file exists
file is under the directory for coin.collection_id
coin_image.filename matches the actual filename
```

This invariant is both a runtime integrity-check target and a test target.

## 9. Collection Rules

- collection names are unique;
- empty collections are allowed;
- collections containing coins cannot be deleted;
- categories are shared globally across collections;
- all image kinds (`avers`, `rewers`, `additional`) move with the coin;
- `collection_number` is optional, manual, and independent of technical `coin.id`.

## 10. Test Strategy

Existing collection tests must be extended rather than duplicated. The repository already contains collection CRUD, statistics, migration, coin-collection, and coin-move tests.

### Backend

Add or extend tests for:

1. collection creation creates its `collection-XXX` directory;
2. startup consistency creates missing directories for existing collections;
3. the consistency check is idempotent;
4. missing `data/`, `data/images/`, or collection directories are recreated safely;
5. existing files/directories are not destructively removed by consistency repair;
6. broken `coin_image` filesystem references are detected/reported by the chosen integrity-check mechanism;
7. collection filtering supports one, multiple, and all collections;
8. quick search combined with collection filtering respects both constraints;
9. archive filtering uses the same collection-selection rules;
10. coin move continues to verify database and filesystem consistency, including failure/rollback paths.

### Frontend / E2E

Add or extend tests for:

1. coin edit renders collection assignment below the page header and above `Zdjęcia`;
2. the current collection is selected when editing a coin;
3. another existing collection can be selected;
4. a new collection can be created inline and becomes selected;
5. the Collections list exposes `Pokaż`;
6. `Pokaż` navigates to `/kolekcje/:id`;
7. a coin-detail collection link navigates to `/kolekcje/:id`;
8. collection detail `Pokaż monety` opens the main catalogue with the collection selected;
9. the catalogue can select all collections;
10. the catalogue can select one collection;
11. the catalogue can select multiple collections;
12. the active collection scope is visible;
13. quick search respects the active collection scope;
14. archive uses the same collection-selection behavior.

## 11. Implementation Order

The agreed implementation order is:

### A. Filesystem lifecycle and startup consistency

Implement runtime directory/database consistency first, including collection-directory creation and safe/idempotent startup repair.

### B. Coin edit layout

Move the existing `CollectionAssignment` block into the correct location: below the page header and above `Zdjęcia`.

### C. Multi-collection filtering in Monety and Archiwum

Expose the existing `collectionIds` model through the UI, make the active scope visible, and ensure quick search and archive behavior use the same scope.

### D. Collection detail view

Refine `/kolekcje/:id` as the collection dashboard and connect it cleanly to the central coin catalogue.

### E. Tests and verification

Extend the existing backend and E2E collection test suites, then run the complete verification suite.

## 12. Reconciliation Notes

This specification supersedes earlier conflicting descriptions of Collections.

In particular:

- moving a coin is **not** a simple `collection_id` update; it creates a new technical coin ID and moves/renames its images;
- image storage is **not** a flat top-level `/images/` directory; the target runtime layout is `data/images/collection-XXX/`;
- per-coin image directories are **not** used;
- the collection filter is multi-select, not single-select;
- `Wszystkie kolekcje` is represented by an empty collection filter;
- `/kolekcje/:id` is a collection dashboard/context view, while `/monety` and `/archiwum` remain the central browsing/search surfaces.

These points must be kept synchronized with the accepted architecture decisions, implementation, and tests.