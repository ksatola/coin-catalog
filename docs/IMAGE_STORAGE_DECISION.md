# Coin Image Storage Decision

## D-030 — Coin Image Storage and Naming

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

Each coin has exactly one `awers` image and exactly one `rewers` image. Additional images may be added without a fixed limit and are numbered sequentially as `01`, `02`, `03`, and so on. Additional images cover cases such as slab photographs, rim photographs, or additional views.

The application database stores image metadata and references separately from the image file contents. Image files are never stored as SQLite BLOBs.

The current implementation already stores image metadata in SQLite and exposes image association, serving, replacement, and additional-image operations through the application API and UI.

When an image is imported through the application by drag-and-drop or paste, the application uses the selected or identified coin ID to construct the target filename and must never silently overwrite an existing image. If the target filename already exists, the user must explicitly confirm replacement before the existing file is overwritten.

### Rationale

The collection contains rectangular JPG photographs that are close to square, and the browser grid is designed around square image cells. Direct flat storage in `images/` keeps the file collection simple and predictable; the six-digit coin ID provides stable lexical sorting and grouping without requiring per-coin directories.

Keeping image metadata in SQLite while retaining the actual JPG files on disk separates structured catalogue data from potentially large binary files and leaves room for future metadata, serving, and thumbnail features.

### Consequences

- The repository uses a top-level `images/` directory alongside `data/` for application image data.
- Git must ignore `/images/`.
- Image filenames use the six-digit coin ID and approved suffix format.
- A coin has one primary obverse image and one primary reverse image.
- Additional images are represented as sequential numbered files for the same coin.
- Image metadata is stored in SQLite in the current implementation.
- Future image-management work must preserve the no-silent-overwrite rule.
