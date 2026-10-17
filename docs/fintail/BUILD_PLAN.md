# Fintail — Build Plan v2 (simplified Macro: an agent + MCP connectors for retail investors)

**What:** A simplified fork of [Macro](https://github.com/macro-inc/macro) for retail investors.
- The centre of the app is **an AI agent** that connects to your broker accounts and market data through **MCP connectors**.
- The agent answers questions about your portfolio, draws charts, runs technical analysis, reads news and filings, and runs **scheduled routines** like a morning brief and alerts.
- Everything Fintail doesn't need (CRM/Sales, channels, calls, coding agents, PRs, etc.) is **switched off and not deployed**.

**Business:** Arnav hosts it (AWS Singapore) and sells subscriptions. It's open source under AGPLv3, so others can self-host it with their own keys.
**Who builds:** Claude Code, phase by phase, with Arnav approving each phase.
**Based on Macro commit:** `b25a95b4` (16 Oct 2026).
**Date:** 17 Oct 2026

> **Status (17 Oct 2026, Phase 0):** this plan was checked against `macro-inc/macro` @ `b25a95b4`. The fork is `arnavx0/fintail-macro` (the name `fintail` is taken by the earlier Next.js app).
>
> **Product (Arnav, 17 Oct 2026):** remodel Macro into Fintail, a **unified personal platform for retail investors**. It aggregates all of a user's investment data (brokers, crypto, CSV/manual accounts, email contract notes) and uses AI agents, tools, MCP connectors and routines to analyse their portfolio and the markets. It is a hosted SaaS with a public repo; API keys and secrets are never committed.
>
> **Decided:** Fintail data is **per-user**. Macro's team-scoped CRM tables are not reused (CS-71). Fintail adopts the CRM *pattern*: watchlist stages as a host of the `databases` engine, with instruments, holdings and watchlists in new Fintail crates. Macro's CRM/Sales stays in the code but is hidden.
>
> **Verified corrections applied:** tool-policy location (§5/§6), fork name (§8), and Macro's `CLAUDE.md` push/stash rules (§10).

---

## 1. Key finding: Macro already has the agent + MCP machinery

| Already in Macro | What it does | Fintail uses it for |
|---|---|---|
| `crates/agent` | Model-agnostic agent loop (Anthropic/OpenAI/Gemini), tool calls, usage metering | The Fintail assistant |
| `crates/mcp_client` | Users connect **remote MCP servers**, incl. OAuth with dynamic client registration; tokens stored; tools executed via `rmcp` | **SnapTrade MCP** (broker accounts), Fintail's own market-data MCP |
| `crates/pipedream_mcp` | Pipedream Connect: 1-click connections to third-party apps, surfaced as agent tools | Optional extras (Gmail for contract notes, Google Sheets, Notion) |
| `crates/ai_toolset` + `crates/ai_tools` | Framework for native tools. Every tool must declare `ToolKind` (ReadOnly / Additive / Destructive). | New finance tools (portfolio metrics, indicators, charts, news, filings) |
| `services/scheduled_action` + web `features/routines` | Scheduled and event-triggered agent runs ("routines") with run history | Morning brief, weekly review, alert checks, earnings watch |
| `crates/memory` | Per-user memory | Remembers your strategy, watchlist and preferences |
| `services/mcp_service` | Exposes Fintail's tools to Claude/ChatGPT over MCP (OAuth) | Ask Claude about your Fintail data |
| `notification_service` + Home inbox (Signal/Noise) | Notifications, push, email | Alerts and routine results |
| Docs, Files, **`block-spreadsheet`** (Excel formulas, .xlsx import/export) | Documents and spreadsheets | Trade journal, research notes, your own models |
| `ai_billing`, `ai_usage`, Stripe (in `authentication_service`) | Plans (`PlanTier`), AI allowances, metering | Fintail's Free / Plus / Pro plans |
| `crates/feature_flags` + web `featureFlags.ts` | Flags | Hiding everything Fintail doesn't need |

**Macro's own rules (`CLAUDE.md`, `CODING.md`) that shape this plan:**
- "Extend existing features; no parallel paths." So Fintail extends `agent`, `mcp_client`, `ai_tools`, routines and billing instead of building new versions.
- New domain logic goes in hexagonal crates (`domain/` · `inbound/` · `outbound/`).
- New services, tools, notification kinds and flags follow the guides in `docs/guides/` and `.agents/skills/` (`new-service`, `create-ai-tool`, `add-notification-kind`, `feature-flags`, `sqlx-migration`).

---

## 2. Simplify: what stays, what goes

**"Goes" means:** turned off with feature flags and **not deployed**, with code left in place. Macro's crates depend on each other (e.g. `email`, `memory` and `ai_tools` all depend on `crm`). Deleting code would break the build and make it hard to pull future Macro updates.

| Keep (Fintail uses it) | Hide and don't deploy |
|---|---|
| Auth (FusionAuth), settings, billing | CRM/Sales, pipelines, contacts enrichment |
| AI chat + agent loop + memory | Channels, DMs, team features |
| `mcp_client`, `pipedream_mcp`, `mcp_service` | Calls, transcription, LiveKit |
| Routines (`scheduled_action`) | Coding agents (`agent_harness`, `coding-agent-worker`, cloud agents), PRs/GitHub |
| Home inbox + notifications | Canvas, forms, projects/initiatives, Slack import |
| Docs, files, spreadsheet, search | Calendar sync (Fintail shows market dates in its own view) |
| Email (optional, behind a flag) for contract notes | Desktop/mobile Tauri builds (web + PWA first) |

**Phase 0 output:** `docs/fintail/SERVICE-SET.md` lists the minimum services that must run for the kept features. That list also sets the server size.

---

## 3. The Fintail app (simple)

**Places:**
1. **Ask:** the agent. This is home.
2. **Portfolio:** net worth, allocation, performance, income, options.
3. **Watchlist**
4. **Inbox:** alerts, briefs, news on holdings.
5. **Journal:** docs + spreadsheets.
6. **Connectors**
7. **Routines**
8. **Settings**

**Example: "How did my portfolio do this week and why?"**
1. The agent calls the SnapTrade MCP for holdings.
2. It calls Fintail tools for prices, returns and news on the biggest movers.
3. It answers with a chart and links.

**Example: "Show NVDA with RSI and the 50/200-day averages."** Fintail's chart tool returns data that the web app draws as a candlestick chart. The agent explains it in plain English, labelled "educational, not advice".

**Example routine:** "Every weekday 8am: morning brief" runs the agent with portfolio, news and calendar tools and puts the brief in the inbox and email.

---

## 4. Connectors (MCP and tools)

| Connector | Type | What it gives | Notes |
|---|---|---|---|
| **SnapTrade MCP** (`https://mcp.snaptrade.com/mcp`) | Remote MCP, OAuth 2.0 + PKCE + dynamic client registration, which Macro's `mcp_client` already supports | Accounts, balances, holdings, balance history, orders, activity (dividends, fees), FX. **No trading tools** (per SnapTrade). | For **SnapTrade Personal** users (end users connect their own brokers). Add it as a one-click preset. Check SnapTrade Personal pricing and terms for your users. |
| **Fintail Market Data MCP** (self-hosted) | Remote MCP run by Fintail, internal auth | Prices, bars, quotes, options chains, assets, market news | Option A: Alpaca's official `alpaca-mcp-server` in `streamable-http` mode with `ALPACA_TOOLSETS` limited to **data toolsets only** (stock, crypto, options data, news, assets). The server can place real trades if trading toolsets are on, so they must be off, and the policy layer (section 5) blocks them as well. Option B: a small Fintail MCP over Twelve Data (US$499/month Venture plan includes commercial display). **Confirm commercial display rights with the provider either way.** |
| **SEC EDGAR** | Native Fintail tool | Filings, insider trades (Form 4), company facts | Free API |
| **FRED** | Native Fintail tool | Rates, CPI, economic releases | Free API key |
| **News** | Native tool over `news_ingest` (RSS headlines + links from sources whose terms allow it, press releases, a licensed news API) | Ticker-tagged headlines | No full articles. No Bloomberg scraping. |
| **X** | Native tool over a shared cache with a **hard spend cap** | Posts from ~200 curated finance accounts + cashtags for most-held tickers | ~US$0.005/post read; Pro plan only |
| **Pipedream apps** (optional) | Existing `pipedream_mcp` | Gmail (contract notes), Google Sheets, Notion | Same read-only policy |
| **IBKR Flex, CSV, manual** | Native tools/importers | Brokers or assets SnapTrade can't reach (CDP, Endowus, CPF, cash) | Stored in Fintail's own tables |

---

## 5. Safety layer (the most important change to Macro)

Macro's `ai_toolset` already marks native tools as `ReadOnly`, `Additive` or `Destructive`. Remote MCP tools from third parties are not covered by that, and no MCP path reads `readOnlyHint` today. So Fintail adds a **tool policy** applied on every MCP path: native `mcp_client` and the shared `mcp_toolset` (Pipedream, in-memory agents). See section 6:

1. **Allow-list per known server:**
   - SnapTrade: all read tools
   - Fintail data MCP: data tools only
2. **Unknown servers:** only tools whose MCP `readOnlyHint` is true.
3. **Always blocked:** tools that place, modify or cancel orders, transfer money or change account settings. Matched by an explicit deny-list plus name patterns (`order`, `trade`, `transfer`, `withdraw`, `update_account`).
4. **Logged:** every external tool call (user, server, tool, time, allowed or blocked).
5. **Tests:**
   - A test registers a fake MCP server with trading tools and proves the agent can't call them.
   - A test proves blocked tools never reach the model's tool list.

Plus:
- **Finance system prompt + evaluation:** the agent explains data and never recommends buying, selling or holding. Advising on investment products in Singapore needs a MAS licence; a lawyer reviews the wording.
- **Numbers from code:** returns, allocation, indicators and P/L come from tools, not model arithmetic.
- **Prompt size guard:** keep under 100k tokens (Claude Haiku 5.5 charges 5× above that).

---

## 6. New code (all inside Macro's existing structure)

| New piece | Where | Pattern to copy |
|---|---|---|
| Tool policy (section 5) | A shared policy type (in `crates/mcp_select` or a small new crate), enforced at **both** tool-listing sites: `crates/mcp_client/src/domain/service/toolset.rs` (native MCP) and `crates/mcp_toolset/src/toolset.rs` (`RemoteMcpToolSet`, used by `pipedream_mcp` and `agent_inmem`). `mcp_client` does not depend on `mcp_toolset`; `mcp_select` chooses between them. Also check `agent_harness`/`agent_egress`. | Hexagonal domain policy; tests on both paths |
| SnapTrade preset + "Connect broker" button | `mcp_client` provider registry + web connectors UI | `provider_registry.rs` (Slack/Linear presets) |
| `crates/portfolio` | Snapshots, transactions, instruments, metrics (TWR, XIRR, P/L, income, options stats); Postgres via SQLx migrations; hosted in `document_storage_service` like other domain crates | `crates/forms` (`wiring.rs`), `add-entity.md` only if it needs entity access |
| Portfolio sync job | A routine-style job in `scheduled_action` that calls the user's SnapTrade MCP tools **directly through `mcp_client` (no model)** and saves daily snapshots | `scheduled_action` targets |
| `crates/market_tools` | Native AI tools: `get_price_history`, `get_indicators` (RSI, MACD, MAs, Bollinger, ATR, computed in Rust), `compare_tickers` | `create-ai-tool` skill; tools in `inbound/toolset/` |
| `crates/research_tools` | `get_filings` (EDGAR), `get_economic_data` (FRED), `get_news(ticker)`, `get_social(ticker)` (X cache) | Same |
| `news_ingest` + `x_ingest` workers | One worker service, SQS/scheduled | `new-service.md` → model `services/slack_import_worker` |
| Chart and table renderers | Web `toolHandlers` for the new tools, drawing with TradingView Lightweight Charts (Apache 2.0; **TradingView attribution required**) and Observable Plot (already in the app) | `create-ai-tool` steps 8–10; `apps/web/src/lib/core/component/AI/component/tool/handler.tsx` |
| Fintail shell (8 places) | `apps/web/src/features/fintail-shell/` with the layered structure (`core/ queries/ primitives/ components/ views/ context/`) behind a flag | `docs/architecture/frontend-features.md`, `features/activity` |
| Portfolio and Watchlist views | `apps/web/src/features/portfolio/`, `features/watchlist/` | Same |
| Notification kinds: `price_alert`, `routine_brief`, `holding_news` | `crates/model_notifications` + senders | `add-notification-kind.md` → `CalendarEventReminder` (scheduled kind) |
| Routine presets | Morning brief, weekly review, earnings watch, price/indicator alert check | `features/routines` + `scheduled_action` |
| Plans | Set `PlanTier` prices and AI allowances for Fintail; Stripe price IDs in Doppler | `crates/ai_billing` (`pricing.rs`, `models.rs`), `authentication_service` Stripe webhook |

---

## 7. Plans (example; test in beta)

| | Free | Plus (S$12/month) | Pro (S$29/month) |
|---|---|---|---|
| Broker connections (SnapTrade MCP) | 1 | Unlimited | Unlimited |
| Charts + indicators | End-of-day | Delayed/real-time US (per data licence) | Same |
| AI questions | 20/month | 300/month | 1,000/month |
| Routines | Morning brief | + weekly review, 20 alerts | Unlimited alerts |
| News | Headlines | + AI tagging | + **X feed** |

Self-host (open source): free, all features, bring your own keys.

**Main running costs:**
- server (sized from `SERVICE-SET.md`, likely smaller than full Macro)
- market data with commercial display rights (up to ~US$499/month)
- news API
- X (~US$300/month, capped, Pro only)
- AI (~US$0.50–1 per paid user/month)
- Stripe

---

## 8. Build phases

Each phase ends with a demo. Don't start the next until Arnav approves.

### Phase 0: Fork, run, map (week 1)
- Fork `macro-inc/macro` to `fintail-macro` (public; done). Add `upstream`. Run with `just run_local --no-doppler --instance fintail`.
- **Connect SnapTrade MCP manually** through Macro's existing MCP connection UI and ask the agent about a test portfolio. This proves the core idea works on day one.
- Write in `docs/fintail/`:
  - `ARCHITECTURE-NOTES.md`: agent loop, `mcp_client`, `pipedream_mcp`, `ai_tools`, routines, memory, notifications, billing, with file paths
  - `SERVICE-SET.md`: minimum services for section 2's "Keep" list, plus measured RAM/CPU
  - `TOOL-SURFACE.md`: every tool the agent can call today, and which must be hidden
- **Done when:** the agent answers a portfolio question from SnapTrade MCP data in the unmodified app.

### Phase 1: Simplify and rebrand (weeks 2–3)
- Feature flags off for the "Hide" list (web + backend entry points; CS rule: a new gate applies at every entry point).
- Compose and deploy only `SERVICE-SET.md`.
- Hide matching AI tools from the agent's toolset.
- Rebrand to Fintail. Footer: AGPL source link, "Not financial advice".
- Fintail shell (8 places) behind `enable-fintail-shell`. Ask is home.
- CI: `just check`, tests, `cargo-deny`, CodeQL, secret scanning, weekly upstream-sync PR.
- **Done when:** a new user sees only Fintail's places, and hidden features are unreachable (routes, tools, search).

### Phase 2: Safety layer (weeks 3–4)
- Tool policy on both MCP tool-listing paths (`mcp_client` and `mcp_toolset`, see section 6) with tests for each.
- Finance system prompt. **Advice evaluation:** 50 "should I buy X?" prompts must be declined while still explaining the data.
- Prompt-size guard.
- **Done when:** the trading-tool test and the advice evaluation pass.

### Phase 3: Connectors (weeks 4–7)
- SnapTrade one-click preset + "Connect broker" flow.
- Fintail Market Data MCP (Alpaca data-only or Twelve Data), hosted as a service, added as a default connection for every user.
- Native EDGAR and FRED tools. `news_ingest` worker + `get_news` tool.
- IBKR Flex, CSV and manual importers into `crates/portfolio`.
- **Done when:** the agent answers holdings, price, filing, macro and news questions with sources.

### Phase 4: Portfolio and charts (weeks 7–10)
- `crates/portfolio` + daily snapshot job via `mcp_client`, plus the metrics engine.
  - **Gate:** 30+ hand-checked test portfolios match within 0.01%.
- `market_tools` (prices, indicators tested against a reference library).
- Chart/table tool renderers (Lightweight Charts + Observable Plot).
- Portfolio and Watchlist views.
- **Done when:** the Portfolio page and "show me X with RSI" both render correctly for test accounts.

### Phase 5: Routines, alerts, X (weeks 10–12)
- Routine presets (morning brief, weekly review, earnings watch).
- Alert routine with conditions on price and indicators. Notification kinds → inbox, email, push.
- `x_ingest` with a hard spend cap + `get_social` tool (Pro only).
- **Done when:** a test user receives a correct morning brief for 5 days and alerts within 1 minute of the condition.

### Phase 6: Billing, hosting, launch (weeks 12–15)
- Fintail plans in `ai_billing`/Stripe. Plan limits enforced in the domain layer (never in handlers).
- AWS Singapore production with the service set:
  - TLS
  - nightly encrypted backups with a tested restore
  - monitoring incl. AI/data/X spend
  - staging environment
- Security:
  - per-user isolation tests
  - penetration test
- Legal (professional review):
  - ACRA registration
  - PDPA privacy policy
  - terms of service
  - MAS wording review
  - data-provider attributions
- **Evaluation:** 100 portfolio questions.
  - Gate: at least 95% correct
  - zero invented numbers
  - zero recommendations
  - zero trading-tool calls
- Beta: 50–100 investors.
- **Done when:** beta metrics are met (section 9).

---

## 9. Beta success metrics

| Metric | Target |
|---|---|
| Sign-up to first answered portfolio question | < 5 minutes |
| Portfolio value matches broker | within 0.5% for ≥ 98% of accounts |
| Weekly active at week 4 | ≥ 50% |
| Users with a routine turned on | ≥ 60% |
| Free → paid | ≥ 5% |
| Trading-tool calls, data leaks, unlicensed data shown | 0 |

## 10. Rules for Claude Code (non-negotiable)
1. Follow Macro's `CLAUDE.md`, `CODING.md`, `docs/guides/` and `.agents/skills/`. Extend existing features; don't build parallel versions.
2. **Hide, don't delete,** Macro features (flags + not deployed), so upstream updates still merge.
3. **Read-only:** no tool, MCP or code path may place orders, move money or change account settings. The tool policy is mandatory for every external tool.
4. No buy/sell advice. Numbers from tools, not the model. Licensed data only; no scraping.
5. Never commit secrets. Never deploy or touch production without Arnav's explicit go-ahead.
6. Macro's `CLAUDE.md` wins where it is stricter: commit on a feature branch, but **push or open a PR only when asked**; never `git stash`.

---

## Kickoff prompt for Claude Code

> Read `FINTAIL_BUILD_PLAN.md` fully, then the repo's `CLAUDE.md` and `CODING.md`. Fork `macro-inc/macro` to my GitHub as a public repo named `fintail`, clone it, add `upstream`, copy the plan to `docs/fintail/BUILD_PLAN.md`, and start **Phase 0**. Fintail is a simplified Macro: the agent, MCP connectors, routines, memory, inbox, docs/spreadsheets and billing stay; everything else is hidden with feature flags and not deployed, never deleted. Follow the rules in section 10. Stop after each phase, show me the "Done when" results, and wait for my approval. Ask before schema decisions, before changing `mcp_client`, `agent` or billing behaviour, and before using real SnapTrade, Alpaca, Twelve Data, X, Stripe, AWS, Anthropic or OpenAI credentials.

---

## Sources
- Macro repo (commit `b25a95b4`): `CLAUDE.md`, `CODING.md`, `docs/guides/`, `crates/mcp_client/AGENTS.md`, `crates/pipedream_mcp/AGENTS.md`, `crates/agent/AGENTS.md`, `services/scheduled_action/AGENTS.md`, `crates/ai_toolset/src/annotations.rs`, `crates/ai_billing`, `apps/web/src/features/block-spreadsheet/README.md`
- SnapTrade: [MCP server](https://docs.snaptrade.com/docs/mcp-server) · [Brokerage API and pricing](https://snaptrade.com/brokerage-api)
- Alpaca: [Official MCP server (Glama listing)](https://glama.ai/mcp/servers/alpacahq/alpaca-mcp-server)
- Twelve Data: [Business pricing](https://twelvedata.com/pricing-business)
- X API: [OpenTweet pricing summary](https://opentweet.io/x-api-pricing)
- Lightweight Charts: [Best of JS](https://bestofjs.org/projects/lightweight-charts)
- SEC: [EDGAR APIs](https://www.sec.gov/page/sec-api-documentation)
- MAS: [Financial advisers](https://www.mas.gov.sg/regulation/capital-markets/understand-the-types-of-capital-market-entities/financial-advisers)
