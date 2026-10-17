# Fintail service set (Phase 0)

The minimum services Fintail's kept features need, from
`tooling/xtask/crates/xtask_local/src/local/inventory.rs` and
`docker/docker-compose*.yml` at `b25a95b4`.

**Resource measurements: pending.** Docker, Nix and `just` aren't installed
on the dev machine yet, so `just run_local` hasn't been run. Fill in the
RAM/CPU columns from `docker stats` once it is.

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
