---
name: backend-api-curl-socket-testing
description: Tests backend API flows with realtime websocket verification. Use when validating end-to-end backend plus notification delivery by running backend and notification server in separate terminals, connecting a websocket client (wscat/websocat), then executing curl flows and recording markdown test/error reports.
---
# Backend API + Socket Curl Testing

## Purpose

Run end-to-end testing across:

1. Backend HTTP API (`curl`)
2. Notification Server process
3. WebSocket client session (`wscat`/`websocat`)

This skill extends `backend-api-curl-testing` by adding realtime socket observation.

## Scope

- Backend API tests are still contract-driven from `docs/backend-api/**`.
- Notification service is started in a separate terminal.
- WebSocket client is connected before API test actions that should emit events.

## Output Requirements (Mandatory)

For every run, always write:

1. `docs/backend-api/test-reports/<timestamp>-backend-api-socket-test.md`
2. If any failure exists: `docs/backend-api/test-reports/<timestamp>-backend-api-socket-errors.md`

`<timestamp>` format: `YYYYMMDD-HHMMSS`.

## Standard Workflow

Copy and track this checklist:

```text
Backend API + Socket Test Progress
- [ ] 1) Read API docs and identify flows with websocket expectations
- [ ] 2) Ensure Docker dependencies are running
- [ ] 3) Start backend server terminal
- [ ] 4) Start notification server terminal
- [ ] 5) Bootstrap auth and collect token/user_id via curl
- [ ] 6) Connect websocket client (wscat/websocat) with token and user_id
- [ ] 7) Execute curl test flows and observe websocket events
- [ ] 8) Assert API + websocket outcomes
- [ ] 9) Write markdown report
- [ ] 10) Write markdown error log when failures exist
```

## 1) Read Documentation Contracts

Before testing:

- `docs/backend-api/README.md`
- target router docs in `docs/backend-api/<router>/`
- `docs/notification-api/` docs if validating specific socket event schema

Use docs as source of truth for endpoint contracts and websocket payload expectations.

## 2) Start Dependencies with Docker

Ensure required dependencies are running:

```bash
# MySQL
docker run -d --name goportal-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=goportal-db \
  -p 3306:3306 \
  mysql:8

# Redis
docker run -d --name goportal-redis \
  -p 6379:6379 \
  redis:7

# RabbitMQ
docker run -d --name goportal-rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3.13-management
```

If containers already exist, start/reuse them instead of recreating.

## 3) Start Services in Separate Terminals

### Terminal A: Backend

Run from `backend/`:

```bash
go run . -config configs/config.yaml -migrate
```

### Terminal B: Notification Server

Run from `notification/`:

```bash
go run ./cmd/notification-server
```

Do not merge logs from both processes into one terminal stream.

## 4) Auth Bootstrap via curl

Use curl flow:

1. register (optional if user exists)
2. login
3. extract:
   - JWT token
   - user id

These values are used for both API Authorization and websocket query params.

## 5) Connect WebSocket Client (Configurable)

Preferred tools:

- `wscat` (Node)
- `websocat` (Rust)

Connection URL template:

```text
ws://localhost:8085/ws?user_id=<USER_ID>&token=<JWT_TOKEN>
```

If server requires a different host/path/port, make them configurable at run time:

- `WS_BASE_URL`
- `WS_PATH`
- `WS_USER_ID`
- `WS_TOKEN`

## 6) API + Socket Assertions

For each flow step:

- assert HTTP status and response envelope (`success`, `code`, `message`)
- assert websocket side effects:
  - expected event count
  - expected event type
  - expected payload keys or values

When no socket message is expected, explicitly record timeout/no-event behavior.

## 7) Evidence Collection Rules

Always capture:

- curl request command
- HTTP status and response body
- websocket transcript snippet around each relevant API step
- timestamps to correlate API request and socket event

Keep raw transcript excerpts short but sufficient for traceability.

## 8) Required Report Format

Create `docs/backend-api/test-reports/<timestamp>-backend-api-socket-test.md`:

```md
# Backend API + Socket Test Report

- Timestamp: <ISO8601>
- Base URL: http://localhost:8080
- WS URL: ws://localhost:8085/ws?user_id=...&token=...
- Docs scope: <routers/features tested>
- Backend commit/ref: <if available>

## Summary

- Total HTTP steps: <n>
- HTTP Passed: <n>
- HTTP Failed: <n>
- Socket checks: <n>
- Socket Passed: <n>
- Socket Failed: <n>

## Environment

- Docker deps: <containers>
- Backend command: `go run . -config configs/config.yaml -migrate`
- Notification command: `go run ./cmd/notification-server`
- WS client: `wscat` | `websocat`

## Test Steps

### 1) <Step name>
- HTTP Endpoint: `<METHOD> <PATH>`
- Expected HTTP: `<status/code>`
- Actual HTTP: `<status/code>`
- Expected Socket: `<event/no-event>`
- Actual Socket: `<event/no-event>`
- Result: PASS|FAIL
- Notes: <short note>

## Socket Transcript Highlights

```text
<key websocket lines>
```

## Findings

- <important observations>

## Next Actions

- <follow-ups>
```

## 9) Required Error Log Format

If any failure occurs, also create:

`docs/backend-api/test-reports/<timestamp>-backend-api-socket-errors.md`

```md
# Backend API + Socket Error Log

## Failure 1: <name>

- HTTP Endpoint: `<METHOD> <PATH>`
- Expected HTTP: <status/body contract>
- Actual HTTP: <status/body>
- Expected Socket: <event>
- Actual Socket: <event/no-event>

### Curl Request
```bash
<curl command>
```

### HTTP Response
```text
<headers + body snippet>
```

### WebSocket Transcript
```text
<socket snippet>
```

### Suspected Root Cause
- <short hypothesis>

### Suggested Debug Entry Point
- <file/symbol candidates>
```

## Notes

- Keep tests deterministic and contract-focused.
- Use stable naming for test users/entities: `curl-socket-test-<timestamp>`.
- When failures occur, preserve enough websocket context for later debug skills.
