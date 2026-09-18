# Collections UI and Integrity Agreements

This document records the agreements made for Phase 8 after reviewing the current implementation and the Collections UI.

## 1. Coin Edit — Collection Assignment

The collection assignment controls already exist in the coin edit view. The required change is **layout**, not creation of a new collection-assignment mechanism.

The collection assignment block must be displayed:

```text
Edytuj monetę

[ Kolekcja ]

[ Zdjęcia ]
```

More precisely:

- it belongs to the coin edit page,
- it must appear **below the `Edytuj monetę` page header**,
- it must appear **above the `Zdjęcia` section**,
- it must not be rendered as a page-level block above the page header,
- it contains the existing collection selector,
- it allows selecting another existing collection,
- it allows creating a new collection inline and selecting it for the coin.

The existing move workflow remains the domain mechanism for changing a coin's collection.

## 2. Filesystem Lifecycle and Startup Consistency Check

The application is responsible for both the SQLite database and the collection image filesystem structure.

The application must be able to prepare its required runtime structure from scratch and must repair missing non-destructive filesystem structure during startup.

### Startup behavior

A startup initialization/consistency step must ensure at minimum:

```text
data/
├── coin-catalog.db
└── images/
    ├── collection-001/
    ├── collection-002/
    └── ...
```

The check must be idempotent.

Required behavior:

- create the `data/` directory when missing,
- initialize the database when the database file is missing, using the application's normal migration/initialization flow,
- create `data/images/` when missing,
- for every collection present in the database, create its `collection-XXX` directory when missing,
- do not delete an orphan filesystem directory merely because it is not represented by a collection record,
- do not create fake image files for missing `coin_image` files,
- detect/report broken image references rather than silently inventing data.

The consistency check is intended primarily for first startup and recovery from missing directories, but it should be safe to execute on every application startup.

### Collection creation

Creating a collection must also create its filesystem directory. A newly created collection must not normally be left in the database without its required collection directory.

### Safety principle

Automatic repair may create missing required structure, but must not perform destructive cleanup based only on an inferred mismatch between database and filesystem.

## 3. Collections as a UI Context

Collections are a first-class UI concept, not merely a technical property of a coin.

The main navigation entry for Collections leads to the collection management/list view.

A collection item must provide a clear action such as:

```text
[Pokaż]
```

which navigates to:

```text
/kolekcje/:id
```

For example, collection `1` uses:

```text
/kolekcje/1
```

The collection name shown on a coin detail page remains a read-only link to that collection's detail view.

## 4. Collection Detail View

The collection detail view and the coin catalog must be treated as parts of one consistent navigation model.

`/kolekcje/:id` is the **dashboard/context view for one collection**. It should present the collection's identity and persisted statistics and provide an action to view its coins.

The action:

```text
Pokaż monety
```

should open the main coin catalog with that collection selected, e.g.:

```text
/monety?collection_id=1
```

The collection detail view should not become a second, independent implementation of the coin catalog.

## 5. Collection Filtering in Monety and Archiwum

The main `Monety` and `Archiwum` views use one shared collection-filter concept.

The user must be able to select:

- all collections,
- exactly one collection,
- multiple collections.

Conceptually:

```text
Kolekcje:
[ Wszystkie kolekcje ▼ ]
```

with multi-selection such as:

```text
☑ Default Collection
☑ Collection 3
☐ Collection 2
```

The existing `collectionIds: number[]` filter model is the basis for this behavior.

### All collections

"Wszystkie kolekcje" is represented by an empty collection filter rather than by a special collection ID.

```text
collectionIds = []
```

### One or more collections

Examples:

```text
collectionIds = [1]
collectionIds = [1, 3]
collectionIds = [2, 3, 4]
```

### Quick search scope

The quick/free-text search always operates inside the currently selected collection scope.

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

The active collection scope must be visible in the UI so that the user can always tell whether the current results represent:

- all collections,
- one selected collection,
- multiple selected collections.

The catalog remains one central catalog; collection selection is a filter/context, not a separate catalog mode.

## 6. Coin Detail and Coin Edit

### Coin detail

The coin detail page shows its collection as read-only context:

```text
Kolekcja: Default Collection
```

The collection name is a navigation link to `/kolekcje/:id`.

Changing the collection is not performed on the detail page.

### Coin edit

The coin edit page provides the collection assignment controls described in section 1.

Changing collection uses the existing domain move operation, including the technical coin-ID replacement and filesystem handling defined for Phase 8.

## 7. Current Phase 8 Completion Notes

The following agreed follow-ups are implemented in the current branch:

- Creating a collection creates its required `collection-XXX` image directory before the database transaction is committed.
- `Monety` and `Archiwum` display the active collection scope directly in the page header; an empty selection is shown as `Wszystkie kolekcje` and selected IDs are shown for one or more collections.
- The Collections management view provides `Pokaż` for each collection and navigates to `/kolekcje/:id`.
- Backend coverage includes collection-directory creation; frontend coverage includes active collection scope and collection-detail navigation.

## 8. Test Strategy

Existing collection tests must be extended rather than duplicated. The repository already contains collection CRUD, collection statistics, collection migration, coin-collection, and coin-move tests.

The Phase 8 additions should cover the following missing behavior.

### Backend

1. Creating a collection creates its `collection-XXX` directory.
2. Startup consistency creates missing directories for collections already present in the database.
3. Re-running the consistency check is idempotent.
4. Missing `data/`, image root, or collection directories are safely recreated.
5. Existing files/directories are not destructively removed by the consistency check.
6. Broken `coin_image` filesystem references are detected/reported according to the chosen integrity-check API/logging mechanism.
7. Collection filtering supports one, multiple, and all collections.
8. Quick search combined with collection filtering respects both constraints.
9. Archive filtering respects the same collection-selection rules.
10. Existing coin move tests continue to verify DB + filesystem consistency.

### Frontend / E2E

1. Coin edit renders collection assignment below the page header and above the image section.
2. The current collection is selected when editing a coin.
3. A different existing collection can be selected.
4. A new collection can be created inline and becomes selected.
5. The Collections list exposes a `Pokaż` action.
6. `Pokaż` navigates to `/kolekcje/:id`.
7. A coin detail collection link navigates to `/kolekcje/:id`.
8. Collection detail `Pokaż monety` opens the main catalog with the collection selected.
9. The catalog can select all collections.
10. The catalog can select one collection.
11. The catalog can select multiple collections.
12. The active collection scope is visible in the catalog.
13. Quick search respects the active collection scope.
14. Archive uses the same collection-selection behavior.

## 9. Implementation Order

The agreed implementation order is:

### A. Filesystem lifecycle and startup consistency

Implement the runtime directory/database consistency mechanism first, including collection-directory creation and safe/idempotent startup repair.

### B. Coin edit layout

Move the existing `CollectionAssignment` block into the correct location in the coin edit page: below the page header and above `Zdjęcia`.

### C. Multi-collection filtering in Monety and Archiwum

Expose the existing `collectionIds` model through the UI and make the active scope visible. Ensure quick search and archive behavior use the same scope.

### D. Collection detail view

Refine `/kolekcje/:id` as the collection dashboard and connect it cleanly to the central coin catalog.

### E. Tests and verification

Extend the existing backend and E2E collection test suites to cover the agreed filesystem, navigation, filtering, search-scope, and UI behavior. Run the complete verification suite after the changes.

## 10. Follow-up Tasks — Coin Edit Save Separation

The following tasks were identified during review of the current coin edit save flow and are pending implementation and verification.

- [x] **Separate collection save from coin-detail save in coin editing.** The collection assignment/move must have its own save action and must not be part of the main `Zapisz zmiany` action for coin details.
- [x] **Keep coin-detail save focused on coin attributes.** The main coin edit save should update coin details without moving the coin between collections.
- [x] **Define and implement independent collection-save behavior.** Collection changes must use the existing atomic coin-move mechanism without coupling it to the coin-detail update flow.
- [x] **Add automated tests for the separated save mechanisms.** Cover collection change/save independently from coin-detail update, including the case where both collection and coin attributes have been edited before either save action is used.
- [x] **Add regression coverage for the interaction with categories.** Category assignment/removal must remain an independent save mechanism and must not be affected by collection or coin-detail saves.
- [x] **Fix vertical spacing in the coin edit UI.** The edit header, Collection section, and Photos section now use the intended vertical spacing.

### Notes

- The spacing issue has been completed and is no longer deferred.
- The current category mechanism is the reference pattern for independent save behavior: category assignment/removal is handled by its own controls and API calls.
