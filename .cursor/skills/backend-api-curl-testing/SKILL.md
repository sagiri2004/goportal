---
name: backend-api-curl-testing
description: Tests backend API flows using curl based on docs/backend-api contracts. Use when validating backend endpoints end-to-end, reproducing API bugs, or regression testing. Starts backend dependencies with Docker, runs backend server if needed, and writes markdown test reports including failure logs for future debugging skills.
---
# Backend API Curl Testing

## Purpose

Run end-to-end backend API flow tests from `docs/backend-api/**` using `curl` against a locally running backend server.

This skill is backend-only:

- includes Docker setup for backend dependencies (DB/Redis/RabbitMQ)
- does **not** run notification service
- generates report files in markdown for audit/debug handoff

## Output Requirements (Mandatory)

For every test run, always write:

1. `docs/backend-api/test-reports/<timestamp>-backend-api-test.md`
2. If any failure occurs: `docs/backend-api/test-reports/<timestamp>-backend-api-errors.md`

`<timestamp>` format: `YYYYMMDD-HHMMSS`.

## Standard Workflow

Copy and track this checklist:

```text
Backend API Curl Test Progress
- [ ] 1) Read target API docs under docs/backend-api/
- [ ] 2) Ensure dependencies are running via Docker
- [ ] 3) Ensure backend server is running (start if missing)
- [ ] 4) Execute curl flows (happy path + key negative cases)
- [ ] 5) Collect responses and assert status/code/message
- [ ] 6) Write markdown report
- [ ] 7) Write markdown error log if failures exist
```

## 1) Read Documentation Contracts

Before testing, read:

- `docs/backend-api/README.md`
- router-level docs involved in the requested flow
- feature markdown files containing exact request/response examples

Use docs as source of truth for:

- endpoint paths
- required auth
- request body schema
- expected status and error codes

## 2) Start Dependencies with Docker

If dependencies are not running, start them.

Recommended containers:

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

# RabbitMQ (for Watermill)
docker run -d --name goportal-rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3.13-management
```

If container already exists but stopped, start it instead of creating a duplicate.

## 3) Start Backend Server (if needed)

Run from `backend/`:

```bash
go run . -config configs/config.yaml -migrate
```

If backend is already healthy on `http://localhost:8080`, reuse existing process.

Do not start notification service in this skill.

## 4) Curl Test Conventions

- Use `curl -sS -i` for reproducible output.
- Keep response bodies for report.
- Always capture:
  - URL
  - method
  - request body
  - response status
  - response JSON

Auth bootstrap pattern:

1. `POST /api/v1/auth/register` (optional if user exists)
2. `POST /api/v1/auth/login` to obtain token
3. use `Authorization: Bearer <token>` for protected routes

## 5) Minimum Assertions

For each endpoint step:

- Expected HTTP status
- `success` field correctness
- `code` and `message` alignment with docs
- critical fields in `data`

On failure:

- store raw request/response snippet
- include suspected mismatch (docs vs actual)

## 6) Required Report Format

Create `docs/backend-api/test-reports/<timestamp>-backend-api-test.md`:

```md
# Backend API Curl Test Report

- Timestamp: <ISO8601>
- Base URL: http://localhost:8080
- Docs scope: <routers/features tested>
- Backend commit/ref: <if available>

## Summary

- Total steps: <n>
- Passed: <n>
- Failed: <n>

## Environment

- Docker deps: <running containers>
- Backend run command: `go run . -config configs/config.yaml -migrate`

## Test Steps

### 1) <Step name>
- Endpoint: `<METHOD> <PATH>`
- Expected: `<status/code>`
- Actual: `<status/code>`
- Result: PASS|FAIL
- Notes: <short note>

## Findings

- <bulleted key observations>

## Next Actions

- <follow-ups>
```

## 7) Required Error Log Format

If any step fails, also create:

`docs/backend-api/test-reports/<timestamp>-backend-api-errors.md`

```md
# Backend API Curl Error Log

## Failure 1: <name>

- Endpoint: `<METHOD> <PATH>`
- Expected: `<expected status/body>`
- Actual: `<actual status/body>`

### Request
```bash
<curl command>
```

### Response Headers
```text
<headers>
```

### Response Body
```json
<body>
```

### Suspected Root Cause
- <short hypothesis>

### Suggested Debug Entry Point
- <file/symbol candidates>
```

## Notes

- Keep reports concise, reproducible, and contract-focused.
- Prefer deterministic test data naming (e.g. `curl-test-<timestamp>`).
- When a flow mutates state, mention cleanup requirements in report.
