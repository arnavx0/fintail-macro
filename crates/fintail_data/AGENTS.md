# fintail_data

## What it is

Part of Fintail's investor workspace: the user's portfolio across brokers,
the public market, news and alerts, with every figure computed in code so the
AI agent and the web app always agree.

## Start here

- `src/domain/models.rs`: platforms, holdings, value history, instruments,
  news and alerts (GAIN / LOSS / WATCH, never buy/sell advice).
- `src/domain/metrics.rs`: pure metrics — totals, merged holdings, allocation,
  money- and time-weighted returns, volatility, drawdown, concentration,
  income, market search and sector moves. Same formulas as
  `apps/web/src/features/portfolio/core/metrics.ts`.
- `src/domain/ports.rs`: `FintailDataSource`, the read-only data port.
- `src/domain/service.rs`: `FintailService`, the use cases the AI tools call,
  including the alert analysis that links news, prices and positions.
- `src/outbound/sample.rs`: the deterministic sample source.

## Scope

- Owns: investor data models, metrics, the data-source port and the sample.
- Not here: broker connections (SnapTrade via `mcp_client`), the web UI
  (`apps/web/src/features/{portfolio,markets}`), the agent loop (`agent`).

## Boundaries

- Depends on: `ai_toolset` (feature `ai_tools`).
- Used by: `ai_tools` (the Fintail toolset).

## Recipes

- Change a sample table: edit the web app's sample
  (`features/markets/queries/sample-markets.ts`,
  `features/portfolio/queries/sample-portfolio.ts`), then regenerate
  `src/outbound/sample/data.rs` from it; never hand-edit the generated file.
- Add a metric: `src/domain/metrics.rs` → its `test.rs`, keeping the web
  app's formula in step.

## Checks

- `cargo test -p fintail_data --features outbound`.

## Gotchas

- The sample generator is a bit-for-bit port of the web app's
  `seeded-random.ts`; `outbound/sample/test.rs` pins reference values.
  Changing either side alone makes the agent and the screens disagree.
- Every source must stay read-only: no orders, transfers or account changes.

## Related

- Rules: `.agents/rules/rust/architecture.md`
