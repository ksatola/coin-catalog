# Coin Catalog — Git and Branching Workflow

This document defines the project's practical Git workflow.

The goal is to keep `main` stable while allowing development to proceed incrementally on isolated working branches.

## Branch Roles

### `main`

`main` is the stable project branch.

It should contain only work that has been implemented, tested, documented, and verified to the level appropriate for the current project stage.

Do not develop or experiment directly on `main`.

`main` is the branch from which the next phase or independent working branch should normally be created.

### Phase branches

The normal branch for a development phase is:

```text
phase-N-short-description
```

Examples:

```text
phase-3-database-foundation
phase-4-coin-data-model
phase-5-spreadsheet-import
```

A phase branch may contain multiple small commits while that phase is being developed and tested.

### Other working branches

For work that is independent of a larger phase, use a descriptive prefix:

```text
feature/short-description
fix/short-description
docs/short-description
```

These branches are optional; use a phase branch when the work is naturally part of a development phase.

## Basic Workflow

The normal development cycle is:

```text
main
  ↓
create working branch
  ↓
develop + run + test
  ↓
commit small logical changes
  ↓
push working branch
  ↓
review / final verification
  ↓
pull request → main
  ↓
merge
  ↓
main becomes the new stable state
```

Do not merge incomplete or unverified work merely because a phase has reached a calendar milestone.

## Starting a New Phase

1. Make sure local `main` is up to date with `origin/main`.
2. Create the phase branch from the current `main`.
3. Publish the branch to `origin`.
4. Check out the phase branch in VS Code.
5. Reopen the repository in the Dev Container if necessary.
6. Review the project documentation before implementation:
   - `AGENTS.md`
   - `docs/ARCHITECTURE.md`
   - `docs/DECISIONS.md`
   - `docs/PROGRESS.md`
   - `docs/ROADMAP.md`
7. Discuss and approve any architectural decisions required for the phase before implementing them.

If the working branch was created before the latest stable commit reached `main`, synchronize it with `main` before substantial development begins. Do not silently assume that the branch contains the latest stable state.

## Working on a Branch

Development and execution work normally happens directly on the working branch.

The Dev Container is branch-agnostic: it uses whichever branch is currently checked out in the repository workspace.

Therefore it is normal to:

- edit code in VS Code,
- run the backend and frontend in the Dev Container,
- test the application in the host browser,
- make commits,
- push the working branch,
- continue development on the same branch.

Nothing about the Docker/Dev Container workflow requires development to happen on `main`.

## GitHub Desktop Workflow

GitHub Desktop is the preferred simple Git workflow for this project.

### Create a branch

1. Open the `coin-catalog` repository in GitHub Desktop.
2. Fetch/pull the latest changes from `origin`.
3. Make sure the current branch is `main`.
4. Use **Branch → New Branch**.
5. Enter the phase or working-branch name.
6. Create the branch from the current `main`.
7. Publish the branch to `origin`.

### Switch branches

Use the branch selector in GitHub Desktop to switch between `main` and the working branch.

VS Code will see the checked-out branch when the repository is open.

### Commit and push

While working on the branch:

1. Make one logical change at a time where practical.
2. Review the changed files.
3. Commit with a message describing the actual change.
4. Push the branch to `origin`.
5. Continue development on the same branch.

## VS Code Workflow

VS Code can also manage branches directly.

The current branch is shown in the lower-left status bar. Selecting it opens the branch controls, where you can switch branches and, where appropriate, create a new branch.

The important rule is that the repository must be on the intended working branch before editing or running development work.

After switching branches, the Dev Container continues to work normally because the container operates on the checked-out repository workspace.

## Pull Requests and Completion

When the phase or independent change is complete:

1. Finish implementation.
2. Run the relevant tests and verification steps.
3. Update affected documentation.
4. Update `docs/PROGRESS.md` only with verified results.
5. Push the final working-branch commits.
6. Open a pull request from the working branch to `main`.
7. Review the changes and verification results.
8. Merge only when the work is ready to become part of the stable branch.

After merging:

1. Update local `main` from `origin`.
2. Optionally delete the completed working branch.
3. Create the next working branch from the updated `main`.

## No Permanent `develop` Branch

The project does not use a permanent `develop` branch.

A separate integration branch would add another long-lived state to maintain without a current requirement for it. Phase branches provide isolation while `main` remains the stable integration point.

If the project later grows to require releases, staging, or another long-lived integration state, that workflow will be discussed and recorded as a new project decision before adoption.

## Important Rules

- Never commit development work directly to `main`.
- Keep `main` stable.
- Create working branches from the latest stable `main`.
- Use one phase branch for a normal development phase.
- Use `feature/`, `fix/`, or `docs/` branches for smaller independent work when appropriate.
- Commit small, meaningful changes.
- Push working branches regularly.
- Test and verify before merging.
- Keep documentation synchronized with the actual state.
- Do not rewrite published history unless explicitly requested.
