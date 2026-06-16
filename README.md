# Gold Insights

Global asset intelligence workspace for exploring cross-asset trends, market regimes, and investable opportunity candidates.

## Stack

- pnpm
- Vite
- React
- TypeScript
- ESLint

## Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm lint:maintainability
pnpm validate
pnpm build
```

## Maintainability Governance

This repo keeps an adopted debt baseline and a new-code guard inspired by
`../nextbot`.

- `pnpm lint:new-code:governance` checks touched files.
- `pnpm check:governance-backlog-ratchet` prevents known red zones from growing.
- `pnpm lint:maintainability:hotspots` shows large-file and wide-directory
  refactor targets.

See `docs/maintainability-governance.md` for the operating rules.

## Current Shape

This initialization creates a local research cockpit with seeded market data, cross-asset signals, and opportunity cards. The seed data is intentionally static so product discovery can focus on user value before the data vendor, model, and ingestion architecture are chosen.

## Next Product Questions

- Which user is primary: personal investor, professional analyst, or AI-assisted research team?
- Should the first version optimize for global macro dashboards, opportunity discovery, or portfolio/risk monitoring?
- What is the minimum trusted data set: price history only, fundamentals, news/events, on-chain data, or all of them?
