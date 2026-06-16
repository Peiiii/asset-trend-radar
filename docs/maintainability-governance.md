# Maintainability Governance

Gold Insights adopts a lightweight version of the `../nextbot` governance loop:
guard changed code, keep a ratcheted backlog baseline, and review hotspots
before they become default architecture.

## Commands

```bash
pnpm lint:new-code:governance
pnpm check:governance-backlog-ratchet
pnpm lint:maintainability:hotspots
pnpm lint:maintainability
pnpm validate
```

- `lint:new-code:governance` checks touched files for naming, public package
  imports, and line-budget drift.
- `check:governance-backlog-ratchet` compares current repository debt with the
  adopted baseline.
- `lint:maintainability:hotspots` prints the largest files and widest
  directories for refactor planning.
- `lint:maintainability` runs the guard plus the report.
- `validate` runs typecheck, eslint, and maintainability checks.

## Adopted Baseline

The initial baseline intentionally records current red zones instead of blocking
all work on day one:

- `apps/web-shell/src/index.css`
- `apps/web-shell/src/features/chart-wall/components/chart-wall-page.tsx`
- `packages/local-runtime/src/services/chart-wall-query.service.ts`
- `packages/ui/src/components`

These are not approved patterns. They are fixed debt ceilings. Future changes
should reduce them, split them, or keep them flat.

## Updating The Baseline

Only update `scripts/governance/backlog/governance-backlog-baseline.json` when a
change intentionally accepts new debt. The same change should explain:

- why the growth is necessary now,
- which smaller or simpler options were checked,
- what follow-up split or owner boundary will pay the debt down.

Routine feature work should not update the baseline just to pass CI.

## Refactor Priority

When a change touches a red zone, prefer this order:

1. Delete obsolete code or styling first.
2. Split stable owners out of the large file.
3. Move shared, business-free UI into `@gold-insights/ui`.
4. Move market/query behavior into package owners instead of React components.
5. Add an abstraction only when it removes real duplication or clarifies owner
   boundaries.
