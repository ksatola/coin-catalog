# Coin Catalog — Coding Standards

This document defines the project's coding standards and development-quality conventions.

The goal is simple, readable, consistent, and maintainable code without unnecessary tooling or bureaucracy.

## 1. General Principles

- Prefer clear, simple code over clever or unnecessarily compact code.
- Use established conventions for the language and framework being used.
- Keep functions, classes, and components focused on one clear responsibility.
- Avoid speculative abstractions and premature infrastructure.
- Make code understandable through naming and structure before relying on comments.
- Keep formatting and linting automated where practical.
- Do not introduce additional development tools without a concrete benefit.

## 2. Python

Python code follows **PEP 8** and modern Python 3.14 conventions.

### Naming

- `snake_case` for modules, functions, methods, and variables.
- `PascalCase` for classes.
- `UPPER_SNAKE_CASE` for constants.
- Prefer descriptive names over unexplained abbreviations.

### Formatting

- Use 4 spaces for indentation; never tabs.
- Target a maximum line length of **88 characters**.
- Use **Ruff** for formatting and linting.
- Import ordering should be handled by Ruff rather than maintained manually.

### Type hints

Use type hints for function parameters and return values, particularly for public functions and application boundaries.

```python
def get_coin(coin_id: int) -> Coin | None:
    ...
```

Use modern Python typing syntax where appropriate rather than unnecessary legacy constructs.

## 3. Python Docstrings

Use **Google-style docstrings** for public classes, functions, and methods where documentation adds useful information.

Document:

- purpose,
- important parameters whose meaning is not obvious,
- useful return information,
- relevant exceptions or constraints.

Do not add docstrings to trivial implementation details merely to satisfy a rule.

Example:

```python
def import_coins(filename: str, *, validate: bool = True) -> int:
    """Import coin records from a spreadsheet.

    Args:
        filename: Path to the spreadsheet.
        validate: Whether to validate records before importing.

    Returns:
        Number of successfully imported records.
    """
```

## 4. Static Analysis and Testing

The intended Python quality toolchain is:

- **Ruff** — formatting and linting.
- **Pyright** — static type checking.
- **pytest** — automated testing.

These tools should be introduced and configured as the relevant development step requires them. Their presence in this standard does not imply that every tool has already been installed or configured.

Tests should verify behavior rather than implementation details. Database and API functionality should receive appropriate automated tests as those areas are implemented.

Do not use an arbitrary 100% coverage target as a substitute for useful tests.

## 5. Error Handling

- Do not silently swallow exceptions.
- Catch specific exceptions when the application can meaningfully handle them.
- Allow unexpected exceptions to surface rather than hiding defects.
- Use the framework's established error-handling mechanisms at application boundaries.

Avoid:

```python
try:
    ...
except Exception:
    pass
```

unless there is a documented and deliberate reason for such behavior.

## 6. Comments

Comments should explain **why**, not simply repeat **what** the code does.

Prefer readable code and descriptive names over explanatory comments for obvious operations.

Useful comments should capture constraints, non-obvious decisions, compatibility reasons, or other context that cannot be expressed naturally in the code.

## 7. Frontend — Vue and TypeScript

The frontend uses Vue 3 with TypeScript and Vite.

### Naming

- `camelCase` for variables and functions.
- `PascalCase` for Vue components and classes.
- Use descriptive names.

### TypeScript

- Prefer TypeScript over untyped JavaScript.
- Avoid `any` unless there is a documented reason.
- Add explicit types where they improve clarity or protect application boundaries.

### Vue

- Use Vue 3 Composition API with `<script setup lang="ts">`.
- Keep components focused on a clear responsibility.
- Keep substantial business and data-access logic out of templates.
- Prefer reusable components when reuse is actually justified.
- Do not introduce state management, routing, UI frameworks, or other large frontend infrastructure without an agreed need.

## 8. Security and Secrets

Never commit credentials or secrets to the repository, including:

- passwords,
- API keys,
- access tokens,
- private keys,
- other sensitive credentials.

Use appropriate environment variables or secret-management mechanisms when external services are introduced.

Application data such as the SQLite database is excluded from Git according to the project's data-storage decision.

## 9. Git and Commits

Follow the project's branch workflow documented in `docs/GIT_WORKFLOW.md`.

Commits should be:

- small,
- logically focused,
- descriptive,
- limited to the relevant change.

Examples:

```text
feat: add coin model
fix: reject duplicate catalog numbers
test: add coin repository tests
docs: document database schema
```

Avoid mixing unrelated refactoring or formatting changes into functional commits.

## 10. Documentation

Documentation is part of the implementation.

When a change affects architecture, dependencies, setup, behavior, database design, or development workflow, update the appropriate documentation as part of the same change.

Project documentation must describe the verified current state rather than an intended future state.

## 11. Exceptions to the Standard

These standards are guidelines for consistent professional development, not a reason to make code unnecessarily complicated.

A deliberate exception is acceptable when there is a technical reason. Where the exception materially affects maintainability, architecture, or project conventions, document the reason in the relevant code or project documentation.
