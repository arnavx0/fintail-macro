# Fintail — Build Plan v2 (built into Macro's existing architecture)

> Reference only: the full-architecture variant. The working plan is `BUILD_PLAN.md`. Paths checked against `b25a95b4`, with 3 corrections applied.

**What:** A self-hosted SaaS for retail investors, built as a fork of [Macro](https://github.com/macro-inc/macro) (AGPLv3).
- Aggregates brokerage and crypto accounts (read-only).
- Shows portfolio analytics, market charts and technical analysis.
- Collects news, filings and X posts on what the user owns.
- Provides a journal and an AI that knows the user's portfolio.

**Principle of v2:** every Fintail feature plugs into **Macro's existing services, crates and patterns**. That means its hexagonal crates, the document storage service host, the `databases` engine, AI tools, routines, notifications, the connection gateway, AI projections, plan tiers and the local stack. No parallel systems.

**Who builds:** Claude Code, phase by phase, with Arnav approving each phase.
**Repo snapshot used for this plan:** `macro-inc/macro` @ `b25a95b4` (16 Oct 2026). All paths below exist at that commit unless marked **(new)**.
**Date:** 17 Oct 2026

---

## 0. How to use this plan with Claude Code

Macro has detailed agent instructions. Claude Code **must follow them before this plan**:
1. `CLAUDE.md` → `CODING.md` → the `AGENTS.md` of every directory touched.
2. The matching guide for each change:

| Change | Guide/skill |
|---|---|
| New domain crate, HTTP routes in an existing service | `docs/guides/add-http-endpoint.md`, `.agents/skills/cloud-storage-hexagonal-architecture` |
| New entity type | `docs/guides/add-entity.md` (copy `CrmPipeline`, the smallest correct registration) |
| New web block or view | `docs/guides/add-block.md`, `docs/architecture/frontend-features.md` |
| New worker / Lambda / Pulumi stack | `docs/guides/new-service.md` (copy `services/slack_import_worker` + `services/organization_retention_trigger`) |
| Notification kinds | `docs/guides/add-notification-kind.md` (copy `CalendarEventReminder` for scheduled kinds) |
| Kafka topic/event | `docs/guides/add-kafka-event.md` |
| Migrations / SQLx | `docs/development/database.md`, `sqlx-migration` skill |
| AI tools | `create-ai-tool` skill (never modify `crates/ai_toolset`) |
| Feature flags | `feature-flags` skill |
| Before handing off | `audit` skill, `just check`, per-crate `cargo test -p <crate>`, browser verification |

3. Macro's rules apply as written:
   - branch + small commits, never `main`
   - no deploys and no production access without explicit permission
   - never reset databases without approval
   - no secrets in git
   - update every doc the change makes stale

---

## 1. Rules that never change (Fintail-specific)

1. **Read-only to brokers.** No trading, order, transfer or account-changing calls in any adapter. A CI test fails the build if one exists.
2. **No broker passwords stored.** Aggregator/broker tokens are encrypted with the existing cipher pattern (`crates/cursor_api_key/src/cipher.rs`). Reuse or extract it per CS-26. Don't write new crypto.
3. **Information, not advice.** No buy/sell/hold, price-target recommendations or product recommendations, in any AI tool, prompt, routine or UI copy. In Singapore, advising on investment products needs a MAS licence. A lawyer reviews the wording before launch.
4. **Numbers come from code.** Metrics and indicators are computed in Rust and tested. AI only reads them through tools.
5. **Licensed data only.** No scraping. News is shown as headline + snippet + link. Each source's terms are recorded in `docs/fintail/SOURCES.md` **(new)**.
6. **Per-user privacy.** Portfolio data is owned by the user, access-checked on every route and tool, and never shared through teams unless the user explicitly shares a view.

---

## 2. Architecture map: Fintail on Macro

### 2.1 What Macro already gives you (reuse as-is)

| Need | Existing Macro component | How Fintail uses it |
|---|---|---|
| Sign-in, accounts, teams | `services/authentication_service` (FusionAuth, Google/Microsoft) | Unchanged |
| **Plans and billing** | `crates/ai_billing` (`PlanTier::{Free, Premium, Max}` in `src/domain/models.rs`, Stripe gateway, roles + teams entitlement resolver, AI allowances from Doppler) | **Free → Free, Plus → Premium, Pro → Max.** Prices and AI allowances are set in Stripe/Doppler, not code. Non-AI limits (alerts, X feed) read the same plan tier through the entitlement resolver. If it can't be reused from outside, extract it (CS-26). |
| AI usage limits | `crates/ai_usage`, `crates/ai_billing` admission | Unchanged: every Fintail AI tool call is metered automatically |
| AI tools → chat, agents, MCP | `crates/ai_tools` (`all_tools`), `crates/ai_toolset`, `services/mcp_service` | New portfolio/market/news tools are added once and appear in **chat, agent sessions and MCP** automatically |
| Per-user AI memory | `crates/memory` (runs the agent over *the user's own tools*) | Once the portfolio tools exist, memory picks up holdings/strategy context with no extra code |
| **Scheduled AI automations** | `services/scheduled_action` + `crates/routines` (cron + Kafka/Jev event triggers) | **Morning brief, weekly review and pre-earnings check are default routines**, not a new scheduler |
| **Cached AI dashboard widgets** | `crates/ai_projections` + `services/ai_projections_refresh_handler` | Home widgets such as "What moved today" and "Your week in 5 lines", refreshed on a cadence |
| Notifications + inbox (Signal) + push + email digest | `crates/model_notifications`, `crates/notification`, `services/notification_service` | New notification kinds (section 2.3) |
| Realtime push to open pages | `services/connection_gateway`, `crates/connection_gateway_client` | Live quote and sync-status updates on open pages |
| Tables/boards UI + storage | `crates/databases` (`DatabaseStorage`), `apps/web/src/features/database` | **Watchlists** are a new host of the database engine, like CRM pipelines are |
| Documents, collab notes, @mentions | `crates/documents`, `crates/collab_surface`, sync-service | Trade journal and thesis notes. Instrument notes use the collab-surface-core skill. |
| Spreadsheets, slides | `crates/documents` file-type services, `block-spreadsheet`, `block-pptx` | "Export holdings to spreadsheet", "Portfolio review deck" |
| Email + attachment text | `crates/email`, `services/email_service`, `services/document_text_extractor`, Kafka `macro.email` | **Contract notes and dividend notices** are parsed from the user's synced inbox |
| Calendar | `crates/calendar_events` (`CalendarEvent` with multiple *sources*) | Earnings, dividend and expiry dates become a new **read-only event source** |
| Search | `services/search_processing_service`, `crates/search_service`, OpenSearch | Journal is already indexed. Instruments and news are added as indexed kinds (Phase 6). |
| Feature flags | `apps/web/src/lib/core/constant/featureFlags.ts` (PostHog), `crates/feature_flags` | Every Fintail surface is behind a flag until complete |
| Local stack | `just run_local --no-doppler`, `docker/docker-compose.yml`, `tooling/xtask/crates/xtask_local` | New worker and resources are registered so the whole product runs locally |
| Deployment | `infra/stacks/*` (Pulumi: ECS, RDS, MSK Kafka, OpenSearch, Redis, SQS, Lambda, CloudFront), Doppler, Cloudflare Workers (sync) | Same stacks in Arnav's AWS account (section 6) |

### 2.2 New backend crates (hexagonal: `domain/`, `inbound/`, `outbound/`)

| Crate **(new)** | Owns | Inbound | Outbound | Hosted in |
|---|---|---|---|---|
| `crates/portfolio` | Connections, accounts, instruments (reference), transactions, holdings snapshots, reconciliation | `axum_router` (`/portfolio/...`), `toolset` (AI tools), SQS job handlers | `pg_portfolio_repo`, `snaptrade`, `ibkr_flex`, `tiger`, `csv_import`, `contract_notes` (email port) | Router mounted in **`services/document_storage_service`** (copy `crates/channel_labels` wiring in `src/api.rs` + `src/server.rs`). Jobs in `fintail_worker`. |
| `crates/portfolio_metrics` | Pure functions: returns (TWR, XIRR), P/L, allocation, income, options stats, FX conversion | — | — | Library (no I/O, CS-28 OK because portfolio + tools + projections all use it) |
| `crates/market_data` | Provider port, quote/history cache, FX rates, corporate actions, instrument search | `axum_router` (`/market/...`), `toolset` | `twelve_data` / `eodhd` adapters (provider chosen in config), `pg_price_cache`, Redis hot cache | DSS router + `fintail_worker` refresh jobs |
| `crates/indicators` | Pure indicator math (SMA/EMA/RSI/MACD/Bollinger/ATR/VWAP, levels) + simple backtest | — | — | Library |
| `crates/market_alerts` | Alert rules, evaluation, event log | `axum_router`, `toolset`, SQS evaluator | notification sender (copy `crates/calendar_events/src/outbound/notification_notifier.rs`) | DSS router + `fintail_worker` |
| `crates/market_news` | News items, filings, economic events, X posts (cached), ticker tagging, dedupe | `axum_router`, `toolset`, SQS ingest jobs | `rss`, `edgar`, `fred`, `news_api`, `x_api` (with spend cap) | DSS router + `fintail_worker` |
| `crates/watchlists` | Watchlist app entity on `databases` storage | `axum_router`, `toolset` | `DatabaseStorage` port | DSS router (copy `crates/crm` pipelines + `crm_pipeline_entities` pattern) |

Each crate gets an `AGENTS.md` from `.agents/templates/AGENTS.md` + a `CLAUDE.md` symlink. Run `just hakari` after adding crates.

### 2.3 Registrations in existing code

| Registration | Where | Guide |
|---|---|---|
| Entity types `Watchlist`, `Instrument` (read-only reference record, opened as a block) | `crates/model-entity/src/lib.rs`, `crates/graphql_common/src/entity_type.rs`, the grep checklist | add-entity.md |
| Notification kinds: `PriceAlertTriggered`, `HoldingNewsPublished`, `FilingPublished`, `BrokerSyncFailed`, `EarningsUpcoming` (scheduled, like `CalendarEventReminder`), `ContractNoteNeedsReview` | `crates/model_notifications/src/metadata.rs` + `lib.rs` (append at the end), `BLOCKABLE_NOTIFICATIONS` in `services/notification_service/src/main.rs` | add-notification-kind.md |
| Calendar source `market` (earnings, ex-dividend, payment, option expiry) | `crates/calendar_events` (new source next to Google/email invitations; events are read-only) | calendar_events `AGENTS.md` |
| AI tools | each new crate's `inbound/toolset` → `crates/ai_tools/src/lib.rs`, `tool_context.rs`, `build_context.rs`, `infra/packages/shared/src/ai_tools.ts` | create-ai-tool skill |
| Kafka topic `macro.portfolio` (`portfolio.synced`, `transactions.imported`, `alert.triggered`) | `crates/macro_event_topics/src/lib.rs` + `cargo x kafka-topics` (topic PR merged first) | add-kafka-event.md |
| Routine event triggers on `macro.portfolio` (e.g. "after sync, summarise changes") | `services/scheduled_action/src/domain/event_trigger.rs` → `inbound/kafka_consumer.rs` → `outbound/event_content.rs` | scheduled_action `AGENTS.md` |
| Email consumer for contract notes | `crates/portfolio/src/inbound/contract_note_consumer.rs` **(new)**, copying `crates/crm/src/inbound/call_archived.rs` (grouped consumer, bounded retry, commit after work) | add-kafka-event.md |
| SQS queues (`PortfolioSyncQueue`, `MarketDataQueue`, `AlertEvalQueue`, `NewsIngestQueue`) | `crates/macro_queues`, `tooling/xtask/crates/xtask_local/src/local/resources.rs` | new-service.md §6 |
| Realtime messages (`portfolio_refresh`, `quote_update`) | `crates/connection_gateway_client` (thin per-feature wrapper, like `client/calendar.rs`) | connection_gateway_client `AGENTS.md` |
| Feature flags `enable-fintail-portfolio`, `-markets`, `-alerts`, `-news`, `-x-feed` | `apps/web/src/lib/core/constant/featureFlags.ts` | feature-flags skill |

### 2.4 New deployables (kept to two)

| Deployable **(new)** | Model to copy | What it does |
|---|---|---|
| `services/fintail_scheduler` (EventBridge-scheduled Lambda) | `services/organization_retention_trigger` | Every N minutes enqueues jobs: per-user portfolio sync, market data refresh (shared, not per-user), alert evaluation, news/X ingest |
| `services/fintail_worker` (SQS worker, no port) | `services/slack_import_worker` | Drains the queues above by calling the domain services in the new crates, and hosts the contract-note Kafka consumer |

Register both per `docs/guides/new-service.md`:
- `.github/services-config.json`
- `nix/cloud-storage.nix`
- `deploy-service-generic.yml`
- Pulumi stack
- Doppler project
- `docker/docker-compose.yml` (worker under a `profiles:` entry)
- `inventory.rs` (`opt_in`, so `run_dev` doesn't steal dev messages)
- `resources.rs`
- `BootStubEnv` placeholders in `local_env.rs` for every new key (SnapTrade, market data, news, X), so `--no-doppler` still boots

### 2.5 Frontend (`apps/web`, layered per FE-33)

| Feature **(new)** | Type | Contents |
|---|---|---|
| `features/portfolio` | View with route + nav entry (copy `features/routines` / `features/crm` route pattern) | Home: net worth, allocation, performance, income, AI projection widgets; Holdings; Activity; Accounts & connections |
| `features/block-instrument` | Entity-backed block (`instrument/<id>`) | Chart (TradingView **Lightweight Charts**, Apache 2.0, attribution required), indicators, your trades as markers, news/filings/X timeline, your collab notes, alerts |
| `features/watchlists` | Host of `features/database` (like `features/crm`) | Board/table views: Watchlist → Researching → Own → Sold, custom columns |
| `features/market-alerts` | Panel + settings | Create and manage alerts; plan limits shown |
| AI tool renderers | `*-tool-renderers.tsx` (copy `features/crm/crm-tool-renderers.tsx`) | Holdings tables, mini charts and news cards rendered inside AI chat |

Generated clients: `bun run gen-api` after adding OpenAPI paths in DSS `src/api/swagger.rs`, then the SDK per the `add-sdk-endpoint` skill.

---

## 3. Data (MacroDB migrations in `crates/macro_db_client/migrations/`)

All tables are user-scoped with `user_id`, plus `created_at`/`updated_at`. Money is stored as integer minor units + currency.

- `portfolio_connections`: method, provider ids, status, last_sync_at, encrypted secret
- `portfolio_accounts`, `portfolio_transactions` (unique `(connection_id, source_txn_id)` for idempotent re-sync), `portfolio_holdings_snapshots`, `portfolio_daily`
- `instruments` (global reference) + `instrument_aliases`
- `market_prices_daily`, `market_fx_daily`, `market_corporate_actions` (global, shared cache)
- `market_alerts`, `market_alert_events`
- `market_news_items`, `market_filings`, `market_economic_events`, `market_social_posts` (global caches) + `user_news_reads` (per user)
- `watchlist_entities` (app entity) → `databases.id`
- Grant-cleanup `AFTER DELETE` triggers for the new entity tables, per add-entity.md
- Enum values in their own migration, per add-entity.md

Run `nix develop --command just prepare_db` and commit `.sqlx/`.

---

## 4. End-to-end flows (each must work in the local stack)

1. **Connect a broker:**
   1. Web → `POST /portfolio/connections/snaptrade` (DSS) creates a SnapTrade user and returns a portal URL with `connectionType: read`.
   2. Callback → connection stored encrypted → `PortfolioSyncQueue` job.
   3. `fintail_worker` syncs accounts, positions and transactions idempotently.
   4. Kafka `portfolio.synced` → connection gateway `portfolio_refresh` → Home updates live.
   5. On failure: `BrokerSyncFailed` notification.
2. **Price alert:**
   1. `fintail_scheduler` enqueues `MarketDataQueue` (shared symbols only).
   2. Worker refreshes the cache, then enqueues `AlertEvalQueue`.
   3. `market_alerts` evaluates rules using `indicators`.
   4. `PriceAlertTriggered` reaches the inbox (Signal), push and email digest.
   5. Duplicate deliveries are harmless (collapse key per rule + bar).
3. **Contract note in email:**
   1. Gmail sync (existing) → `macro.email` event.
   2. The `contract_note_consumer` checks sender against the broker allowlist and reads the extracted attachment text.
   3. A deterministic parser per broker runs, with an AI fallback that needs confirmation.
   4. A `ContractNoteNeedsReview` notification goes out. The user confirms, and the transactions are written.
4. **Morning brief:**
   1. On onboarding, a default routine is created through `crates/routines` (cron, user's time zone).
   2. `scheduled_action` runs an agent turn with the portfolio/market/news tools.
   3. The result lands as an inbox item + email. AI usage is metered by `ai_billing`.
5. **Ask AI / MCP:** chat or an external Claude via `mcp_service` calls `get_holdings`, `get_performance`, `get_price_history`, `get_indicators`, `get_news`, `get_filings`, etc. Tool results render with the Fintail tool renderers.
6. **Earnings on calendar:** a `market` calendar source adds read-only events for held/watched tickers. `EarningsUpcoming` fires before each one (scheduled kind).

---

## 5. Product features (unchanged from v1, now mapped to the crates above)

- **Aggregation:**
  - SnapTrade read-only (moomoo, IBKR, Webull, Robinhood, Schwab, Fidelity, eToro, Trading212, Coinbase, Binance, Kraken…)
  - IBKR Flex
  - Tiger (only if its terms allow)
  - email contract notes
  - CSV (CDP, Endowus, Syfe, StashAway, POEMS)
  - manual entries (cash, CPF, SRS)
- **Analytics:** SGD net worth, allocation, TWR + XIRR vs benchmarks, P/L, fees, dividends, options stats, concentration/FX warnings.
- **Markets:**
  - Lightweight Charts with candlesticks, volume and trade markers
  - data from a **commercial-display** provider (Twelve Data Venture is US$499/month and includes real-time US; ask EODHD, FMP and Alpaca for cheaper delayed/EOD quotes)
  - US first; SGX/ASX need exchange approval
- **Technical analysis:** indicators in `crates/indicators`, alerts, AI explanation ("educational, not advice"), backtest with fees.
- **News:**
  - publisher RSS headlines where the terms allow (CNBC, MarketWatch, Fox Business — check each)
  - SEC EDGAR, FRED, press releases, a licensed news API
  - no Bloomberg (no free API or feed, no scraping)
- **X:** pay-per-use (about US$0.005 per post read, 3M/month cap). Curated ~200 accounts, cached once for everyone, hard spend cap, Pro only.
- **Journal:** Macro docs with @mentions of instruments, linked to trades.

---

## 6. Hosting with Macro's architecture

Macro runs as about 40 services plus Postgres, Redis, Kafka, OpenSearch, FusionAuth, S3/SQS/DynamoDB/KMS and Cloudflare Workers (sync). Fintail keeps that architecture. Two stages:

| Stage | How | Notes |
|---|---|---|
| **A. Private beta** | One large EC2 instance in `ap-southeast-1` running Macro's container stack (`just stack up` headless mode) **pointed at real AWS S3/SQS/DynamoDB/KMS** instead of LocalStack, with real secrets from Doppler | Phase 9 must produce a `production-single-host` config. LocalStack and the stub secrets are for development only. Measure RAM/CPU in Phase 0. |
| **B. Public launch** | Macro's Pulumi stacks (`infra/stacks/*`) deployed to Arnav's AWS account: ECS, RDS, MSK, OpenSearch, ElastiCache, SQS, Lambdas, CloudFront, gateway | Plus a Doppler workspace, a Cloudflare account for sync-service Durable Objects, a FusionAuth instance and PostHog. Get a real cost estimate from the AWS pricing calculator before moving; this stage costs much more than Stage A. |

**Other running costs** (from research, confirm before launch):

| Item | Cost |
|---|---|
| SnapTrade | $100/month + $1–2 per connected user |
| Market data | ~$100–499/month |
| News API | Get quotes |
| X | ~$300/month (capped), only once Pro users cover it |
| AI | Metered by `ai_billing` |
| Stripe (Singapore) | 3.4% + S$0.50 per card payment |

**Plans (example):**
- **Free** (PlanTier Free)
- **Plus**: S$12/month (PlanTier Premium)
- **Pro**: S$29/month (PlanTier Max)
- Self-host: free with your own keys

---

## 7. Build phases

Each phase ships in layers (types/access → domain → API → AI tools → frontend), behind flags, and ends with its **Done when** check:
- `just check`
- `cargo test -p` for each touched crate
- web tests
- browser verification in the local stack
- the `audit` skill
- updated `AGENTS.md`/docs

### Phase 0: Fork, run, map (week 1)
- Fork to `fintail` (public). Add `upstream`. Run `just doctor-local` and `just run_local --no-doppler --instance fintail`. Seed with `just seed-scenario apply --file tooling/seed_cli/seed/scenarios/team-perms.json`.
- Write `docs/fintail/`:
  - `ARCHITECTURE-NOTES.md`: confirm every row of section 2 against the code, with corrections
  - `WRITE-PATHS.md`
  - `HOSTING-FEASIBILITY.md`: measured resources of the full stack; list of external accounts needed (AWS, Doppler, Cloudflare, PostHog, Stripe, FusionAuth)
- **Done when:** the full stack runs locally and the notes confirm or correct this plan's mapping.

### Phase 1: Foundation (weeks 2–3)
- Rebrand to Fintail (names, logos, emails, marketing app). AGPL source link. "Not financial advice" in footer and in AI system prompts.
- Map Free/Plus/Pro onto `PlanTier` (Stripe price IDs and allowances via Doppler).
- CI guard: no trading/transfer endpoints in `crates/portfolio` adapters (ast-grep rule in `rules/ast-grep/` or a test).
- AI advice test set (50 prompts) run in CI against the tool prompts.
- Hide unrelated Macro surfaces (GitHub/PRs, coding agent) behind flags. **Don't delete them.**
- **Done when:** CI is green and the rebranded app passes a browser smoke test.

### Phase 2: Portfolio core (weeks 3–6)
- `crates/portfolio_metrics` with 30+ hand-checked portfolios (splits, multi-currency, short options, assignment, deposits). Results must match within 0.01%.
- `crates/portfolio`: migrations, repo, `axum_router` in DSS with access checks (`UserOnly` + owner checks), CSV import + manual accounts.
- `features/portfolio`: Home, Holdings, Activity.
- **Done when:** three CSV imports give correct numbers in the browser and all tests pass.

### Phase 3: Connections and contract notes (weeks 6–9)
- SnapTrade (week-1 spike with real accounts), IBKR Flex, Tiger (if allowed).
- `fintail_scheduler` + `fintail_worker` registered per new-service.md, running in the local stack.
- `macro.portfolio` topic PR → `portfolio.synced` events → connection gateway refresh. `BrokerSyncFailed` notification.
- Contract-note consumer on `macro.email` with per-broker parsers + review flow. `ContractNoteNeedsReview` notification.
- **Done when:**
  - a real moomoo/IBKR account syncs in under 2 minutes
  - re-sync creates no duplicates
  - a forwarded contract note becomes confirmed transactions

### Phase 4: Market data, instruments, watchlists, calendar (weeks 9–12)
- `crates/market_data` with provider port + caches. `Instrument` entity type + `block-instrument` with Lightweight Charts (attribution shown).
- `crates/watchlists` on `DatabaseStorage` + `features/watchlists` as a database host.
- `market` calendar source (earnings/dividends/expiries) in `crates/calendar_events`.
- Live quote push through the connection gateway.
- **Done when:** a user's holdings and watchlist show correct charts, board views and calendar events in the browser.

### Phase 5: Technical analysis and alerts (weeks 12–14)
- `crates/indicators` (tested against a reference library's outputs).
- `crates/market_alerts` + `PriceAlertTriggered` and `EarningsUpcoming` kinds (inbox, push, digest, settings toggle).
- AI chart explainer tool. Backtest with fees.
- **Done when:** alerts fire once (no duplicates on retry) within a minute of the condition in the local stack.

### Phase 6: News, filings, X, search (weeks 14–18)
- `crates/market_news`: RSS (approved sources only, recorded in `SOURCES.md`), EDGAR, FRED, licensed news API, dedupe + ticker tagging.
- `HoldingNewsPublished` and `FilingPublished` kinds.
- X ingest with a hard spend cap in code + console. Pro-only via plan tier.
- Index instruments and news in OpenSearch through `search_processing_service`.
- **Done when:** a 2-week local run stays under the X cap and holdings news appears correctly in the instrument timelines and inbox.

### Phase 7: AI layer (weeks 18–20)
- AI tools for all new crates (create-ai-tool skill) → chat, agents, MCP, memory.
- Tool renderers in the web app.
- Default routines: morning brief, weekly review, pre-earnings check.
- AI projections for Home widgets.
- **Evaluation:** 100 portfolio questions.
  - Gate: at least 95% correct
  - zero invented numbers
  - zero buy/sell advice
- **Done when:** the evaluation passes, the routines run on schedule locally, and MCP returns the same answers.

### Phase 8: Journal, options, exports (weeks 20–21)
- Instrument @mentions in docs. Journal entries linked to transactions.
- Options view (P/L by underlying and strategy tag, expiries).
- "Export holdings to spreadsheet" and "portfolio review deck" via the existing spreadsheet/pptx file-type services.
- **Done when:** these work end to end in the browser.

### Phase 9: Production and launch (weeks 21–25)
- Stage A production config (real AWS services, Doppler, TLS, domain, backups with a tested restore, Grafana alerts, staging environment).
- Stripe live mode for Free/Plus/Pro.
- Security:
  - per-user isolation tests on every new route and tool
  - token encryption verified
  - 2FA
  - OWASP ASVS Level 2 checklist
  - **penetration test**
- Legal (professional review):
  - ACRA registration
  - PDPA privacy policy
  - terms of service with "information, not advice"
  - data-provider attributions
  - MAS wording review
  - IPOS trademark search for "Fintail"
- Beta: 50–100 users free for 1 month, then paid. Plan Stage B (Pulumi) once usage justifies it.
- **Done when:** beta metrics are met (portfolio within 0.5% of broker for ≥ 98% of accounts, ≥ 50% weekly active at week 4, ≥ 5% paid conversion, zero data leaks or unlicensed data shown).

---

## 8. Not in v1
Placing trades · moving money · buy/sell recommendations · copy trading · scraping · full-article reproduction · SGX/ASX real-time · tax filing.

---

## Kickoff prompt for Claude Code

> Read `FINTAIL_BUILD_PLAN.md` fully, then `CLAUDE.md`, `CODING.md` and the `AGENTS.md` of each area you touch. Fork `macro-inc/macro` to my GitHub as a public repo named `fintail`, clone it, add `upstream`, copy the plan to `docs/fintail/BUILD_PLAN.md`, and start **Phase 0** on a feature branch. Build every feature into Macro's existing architecture using the guides and skills listed in section 0. No parallel systems, and don't delete Macro features. Follow section 1's rules: read-only to brokers, encrypted tokens via the existing cipher pattern, no buy/sell advice, licensed data only, no secrets in git, no deploys or production access without my explicit go-ahead. Stop after each phase, show me the "Done when" results, and wait for approval. Ask before schema decisions, new Kafka topics, new deployables, and before using any real third-party credentials.

---

## Sources
- Macro repo @ `b25a95b4`: `CLAUDE.md`, `CODING.md`, `docs/guides/*`, crate and service `AGENTS.md` files ([GitHub](https://github.com/macro-inc/macro))
- SnapTrade: [Brokerage API and pricing](https://snaptrade.com/brokerage-api) · [Broker access guide](https://docs.snaptrade.com/docs/broker-access-guide)
- Twelve Data: [Business pricing](https://twelvedata.com/pricing-business) · [Commercial vs personal use](https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage)
- Databento: [Real-time US market data licensing](https://databento.com/blog/us-stock-market-data)
- OpenTweet: [X API pricing](https://opentweet.io/x-api-pricing)
- Lightweight Charts: [Best of JS](https://bestofjs.org/projects/lightweight-charts)
- SEC: [EDGAR APIs](https://www.sec.gov/page/sec-api-documentation)
- MAS: [Financial advisers](https://www.mas.gov.sg/regulation/capital-markets/understand-the-types-of-capital-market-entities/financial-advisers)
- WorldFirst: [Stripe fees in Singapore](https://www.worldfirst.com/sg/blog/international-transactions/stripe-fees-singapore/)
