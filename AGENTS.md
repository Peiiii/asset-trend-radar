# Gold Insights Agent Rules

## Code Maintainability

- Package/app responsibility boundaries are defined in
  `docs/designs/2026-06-16-package-app-boundary-contract.md`. Before adding a
  feature, decide whether each piece belongs to market-domain, data-adapters,
  data-storage, local-runtime, ui, or app code. Update the contract first if a
  feature needs a new boundary.
- Touching source, scripts, tests, or runtime configuration requires a
  maintainability closeout before final delivery.
- Run `pnpm typecheck` for TypeScript or runtime-path changes. Lint and tests do
  not replace type checking.
- Run `pnpm lint:maintainability:guard` after code changes. Use
  `pnpm lint:maintainability:hotspots` when choosing refactor targets.
- Existing red zones are adopted in
  `scripts/governance/backlog/governance-backlog-baseline.json`. They may shrink
  or stay flat, but they must not grow silently.
- Do not add peer files to an oversized directory. Split into a role folder or
  move logic to the owning package/module first.
- Business logic should have a clear owner, usually a class, service, manager,
  controller, provider, or repository. Plain functions are for pure utilities,
  pure calculations, constants, and stateless mapping.
- When adding or touching business classes, prefer arrow-function instance
  methods. Avoid hollow wrappers that only forward parameters without forming a
  real boundary.
- Cross-workspace imports must use the public package root such as
  `@gold-insights/market-domain`; do not deep import another package's `src`.
- React effects are for syncing external systems. Business orchestration should
  live in query hooks, managers, services, stores, or other explicit owners.

## Required Closeout

For normal code changes, report:

- Validation commands run.
- Whether `lint:maintainability:guard` passed.
- Any red-zone file or directory touched.
- Whether the change made code smaller, simpler, or clearer; if not, why the
  growth was necessary.

Pure docs or wording-only edits may skip build/lint/typecheck, but the final
answer must say why those checks were not applicable.
