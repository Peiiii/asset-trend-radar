# Governance Scripts

Code maintainability checks live under this directory. The shape mirrors the
lighter parts of `../nextbot`: changed-code gates, a backlog ratchet, and
hotspot reports are separate so the project can adopt governance without first
rewriting every legacy surface.

## Layout

- `checks/`: diff-oriented checks for files touched by the current change.
- `backlog/`: adopted maintainability baseline and ratchet check.
- `maintainability/`: human-readable reports for large files and wide folders.
- `shared/`: shared scanning helpers and policy constants.

## Operating Model

The baseline records today's known red zones. Red-zone counts and adopted
budgets may shrink, but must not grow by accident. When a change really needs
to grow a red-zone surface, update the baseline in the same change and document
why that debt is intentional.
