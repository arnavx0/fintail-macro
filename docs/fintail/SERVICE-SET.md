# Fintail service set (Phase 0)

The minimum services Fintail's kept features need, from
`tooling/xtask/crates/xtask_local/src/local/inventory.rs` and
`docker/docker-compose*.yml` at `b25a95b4`.

## Measured resources (17 Oct 2026)

Full unmodified stack, idle, after a fresh `just run_local --no-doppler
--instance fintail` on an M-series Mac (OrbStack, 12 GB to Docker),
`docker stats --no-stream`:

- **Total: about 4.3 GiB RAM** across 33 containers, plus 0.6 GiB for the
  shared `lgtm` trace collector (dev only).
- Largest: OpenSearch 1.19 GiB, FusionAuth 0.60 GiB, Kafka 0.44 GiB,
  LocalStack 0.38 GiB, sync_service 0.31 GiB, analytics_proxy 0.25 GiB,
  document_storage_service 0.18 GiB, Postgres 0.14 GiB, Redis 0.13 GiB.
- Each Rust service uses 15–180 MiB.
- Idle CPU is low except Kafka (about 1 core) and LocalStack.

**Stage A sizing:** in production, LocalStack is replaced by real AWS, and
dropping the services marked "No" below saves little memory. Load adds
Postgres, OpenSearch and Kafka headroom. **Start with 16 GiB RAM and 4
vCPU** (e.g. `m7g.xlarge`, ap-southeast-1) and re-measure under beta load.

## Known local-stack issues

- `mcp_service` crash-loops under `--no-doppler`. Its auth proxy
  (`services/mcp_auth_proxy/src/outbound/fusionauth.rs`) requires a
  `google_gmail` FusionAuth identity provider, which the kickstart only
  creates with real Google OAuth credentials. Not needed until external MCP
  access is in scope.
- `agent_harness_service` crash-looped without Pipedream credentials. Fixed
  by adding boot stubs in `xtask_local` `local_env.rs`.
- `run_local` assumes `bun install` was already run at the repo root.

## Infrastructure (`docker/docker-compose-databases.yml` + recipes)

| Component | Needed | Why |
| --- | --- | --- |
| Postgres (MacroDB) | Yes | All domain data |
| Redis | Yes | Caches, MCP OAuth state (`mcp_client` `redis_state_store.rs`) |
| Kafka | Yes | Domain events, routine event triggers, notifications |
| OpenSearch | Yes | Search |
| FusionAuth | Yes | Sign-in |
| LocalStack (S3/SQS/DynamoDB/KMS) | Yes (local only) | Real AWS in production |

## Rust services

| Service | Keep | Reason |
| --- | --- | --- |
| `authentication-service` | Yes | Sign-in, Stripe webhooks |
| `connection_gateway` | Yes | Live updates |
| `document_storage_service` | Yes | Documents, Soup API, notifications, activity. Hosts new Fintail domain routers |
| `document_cognition_service` | Yes | AI chat + native MCP connection routes |
| `agent_harness_service` | **Yes** | Runs agent sessions for routines and the in-process `@macro` assistant. Disable the Daytona coding runtime only |
| `scheduled_action_service` | Yes | Routines |
| `notification_service` | Yes | Inbox, push, email |
| `mcp_service` | Yes | External MCP access to Fintail |
| `search_processing_service` | Yes | Search indexing |
| `static_file_service` | Yes | File storage |
| `document_upload_finalizer` | Yes | File uploads |
| `contacts_service` | Probably | Check whether sharing or mentions need it |
| `email_service`, `email_pubsub_workers`, `gmail_forwarder` | Optional (flag) | Contract notes from email |
| `calendar_service` | No (v1) | Fintail shows market dates in its own view |
| `unfurl_service`, `image_proxy_service` | Probably | Link previews and images in chat/docs |
| `slack_import_worker` | No | Already `opt_in` |
| `preview_gateway` | No | Coding-agent previews |

## Non-Rust services (`docker/docker-compose.yml`)

| Service | Keep | Reason |
| --- | --- | --- |
| `sync_service`, `websocket_service`, `lexical_service` | Yes | Collaborative docs (journal) |
| `ai_editing_worker` | Probably | AI document editing |
| `static_file_cdn` | Yes | Serves files |
| `analytics_proxy` | Optional | PostHog |
| `lgtm`, `jaeger`, `datadog-agent`, `headless-chrome` | Dev/ops only | Observability and testing |

## To confirm in the running stack

- Boot without `calendar_service`, `preview_gateway` and the email trio, and
  check the web app and chat still work.
- Measure RAM/CPU for the kept set. That sizes the Stage A single host.
