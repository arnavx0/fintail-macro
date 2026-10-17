# Fintail architecture notes (Phase 0)

How the Macro pieces Fintail builds on actually work, checked against
`b25a95b4`. Read with [BUILD_PLAN.md](BUILD_PLAN.md).

## Agent loop

- `crates/agent` (`src/agent_loop.rs`): the model-agnostic turn runner
  (Anthropic, OpenAI, Gemini behind `src/model/router.rs`). Usage is metered
  into `ai_usage` from `src/model/metering.rs`.
- Tools reach the loop through `ai_toolset::ToolSet`. `crates/ai_tools`
  (`src/lib.rs`) assembles every domain crate's toolset per host with
  `tools_for(AiHost)`:
  - `Chat`: AI chat, scheduled agents and memory generation
  - `AgentSession`: the in-process agent
  - `ChannelBot`
  - `Mcp`: `services/mcp_service`
- Tools beyond `EAGER_TOOLS` are deferred and loaded with `LoadTools`.

| Surface | Service | Notes |
| --- | --- | --- |
| AI chat | `services/document_cognition_service` (`/cognition`) | Also mounts the native MCP connection routes (`mcp_client`) |
| Agent sessions and the `@macro` assistant | `services/agent_harness_service` | Two runtimes: Daytona containers (`@coder`, coding agents) and the in-process ACP runtime `crates/agent_inmem` (`@macro`, `INMEM_BOT_ID`) |
| Routines | `services/scheduled_action` + `crates/routines` | Cron and Kafka/Jev event triggers. **A routine run creates an agent session** (`src/domain/target_runner.rs` → `agent_session`), so routines depend on `agent_harness_service` |
| External MCP (Claude/ChatGPT → Fintail) | `services/mcp_service` | `AiHost::Mcp`. Clients apply their own confirmation policy from tool annotations |

**Correction to the plan:** `agent_harness_service` must stay deployed.
Fintail can drop its Daytona/coding runtime but not the service.

## MCP: three paths, no single choke point

| Path | Crate | Used for |
| --- | --- | --- |
| Native MCP servers | `crates/mcp_client`: OAuth incl. dynamic client registration (`outbound/oauth.rs`), presets in `domain/provider_registry.rs` (Slack, GitHub; Linear DCR scopes), tool calls in `domain/service/toolset.rs` | SnapTrade MCP, a Fintail market-data MCP |
| Pipedream Connect | `crates/pipedream_mcp` → `crates/mcp_toolset` (`RemoteMcpToolSet`) | Gmail, Sheets, Notion extras |
| In-process sessions | `crates/agent_inmem` → `crates/mcp_toolset` | The `@macro` assistant |

- `crates/mcp_select` composes native and Pipedream tools per provider.
  Native wins for known providers.
- `mcp_client` does **not** depend on `mcp_toolset`.
- No path reads the remote tool's `readOnlyHint` today.

The Fintail tool policy (BUILD_PLAN §5) must therefore be enforced at both
listing sites (`mcp_client/.../toolset.rs` and `mcp_toolset/src/toolset.rs`),
with tests for each. One option is a shared policy type in `mcp_select`.

## Native tool annotations

- Every tool implements `ToolAnnotated` with `ToolAnnotations::read_only`,
  `additive` or `destructive` (`crates/ai_toolset/src/annotations.rs`).
  Omitting it fails to compile.
- `mcp_service` maps the kind to `readOnlyHint`/`destructiveHint`.
- Inventory: [TOOL-SURFACE.md](TOOL-SURFACE.md).

## Memory

`crates/memory` generates a per-user free-text memory by running the agent
over the user's own tools. `agent_inmem` loads it into context. Fintail's
portfolio tools are picked up automatically once they're in `ai_tools`.

## Notifications

- Kinds: `crates/model_notifications/src/metadata.rs`.
- Delivery: `services/notification_service` (inbox, push, email).
- `BLOCKABLE_NOTIFICATIONS` is in `services/notification_service/src/main.rs`.
- Scheduled-kind model: `CalendarEventReminder`.
- Guide: `docs/guides/add-notification-kind.md`.

## Billing

- `crates/ai_billing`: `PlanTier { Free, Premium, Max }`
  (`src/domain/models.rs`).
- Code comments price Premium at $40/seat and Max at $200/seat. Pricing
  numbers come from Doppler (`src/config.rs` → `src/domain/pricing.rs`).
- Admission gate: `src/domain/admission.rs`.
- Stripe is called only from `src/outbound/stripe_gateway.rs`.
- Fintail's S$12/S$29 tiers need new Stripe prices and Doppler values, plus
  the comment updates.

## Secrets

- CS-72 (`.agents/rules/rust/security.md`): store user or third-party secrets
  only as AWS KMS ciphertext. Follow `crates/cursor_api_key` (direct KMS) or
  `crates/microsoft_oauth_grant_db_utils` (envelope), with the encryption
  context bound to the owner.
- `mcp_client` already stores OAuth tokens through
  `persisting_credential_store.rs`. Check whether that meets CS-72 before
  relying on it for broker tokens.
- Config comes only through `macro_config` and Doppler, plus a `BootStubEnv`
  placeholder in `xtask_local` for each new key (CS-14..18).
- Nothing secret goes in git.

## Decision: adapt the CRM pattern, not its tables

Arnav's positioning is "a unified CRM platform for retail investors". Plan 2
hides CRM/Sales, so this needs a decision before Phase 1.

What Macro's CRM is (`crates/crm/AGENTS.md`):
- team-scoped companies, contacts and pipelines
- pipelines are a consumer of the shared `databases` engine
- 14 AI tools, CSV import/export
- used by `email`, `memory`, `ai_tools`, `scheduled_action`, search and others

Possible investor mapping:

| Macro CRM | Fintail |
| --- | --- |
| Company | Instrument or company you follow |
| Pipeline (stages) | Watchlist: Watching → Researching → Own → Sold |
| Contact | Broker, adviser, information source |
| Pipeline entry fields | Thesis, target allocation, notes, alerts |

Constraints:
- **CS-71:** don't repurpose a table or type because its shape fits.
  Instruments are not companies, so reuse the `databases` engine (as CRM
  pipelines do) rather than CRM's own tables.
- CRM data is team-scoped. Fintail portfolio data is per-user.

**Decided (17 Oct 2026):** Fintail is a *personal* platform. It keeps the CRM
UI pattern and the `databases` engine (Plan 1's "watchlists as a database
host") and puts instruments, holdings and watchlists in new per-user Fintail
crates. Macro's CRM/Sales is hidden, not reused.
