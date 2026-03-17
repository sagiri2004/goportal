---
name: backend-delivery
description: Implements backend features and bug fixes in this Go project, maintains router-based backend API documentation with request/response JSON contracts, updates Postman collections, and validates changes with build and test commands.
---

# Backend Delivery Skill

## Purpose

Use this skill for backend tasks in `backend/` that require end-to-end delivery:

- Implement or fix backend code.
- Update docs for behavior and usage.
- Create or update Postman API documentation.
- Run build/tests to validate before reporting completion.

## Scope

- Language/runtime: Go (module in `backend/`).
- Typical areas: `pkg/`, `main.go`, `configs/`, `migrations/`.
- Output artifacts:
  - Code changes in backend files.
  - Documentation updates in router/function-based structure (preferred under `docs/backend-api/`).
  - Postman files under `docs/postman/`:
    - `goportal.postman_collection.json`
    - `goportal.postman_environment.json` (optional)

## Backend Folder Structure Conventions

Use these conventions by default unless the user explicitly requests otherwise:

- `pkg/models/`: GORM model structs (`User`, `Relationship`, etc.).
- `migrations/`: SQL migrations managed by goose.
- `pkg/repositories/` + `pkg/repositories/impl/`: persistence interfaces and implementations.
- `pkg/services/` + `pkg/services/impl/`: business logic interfaces and implementations.
- `pkg/controllers/`: HTTP handlers/controllers.
- `pkg/serializers/`: API request/response payload contracts.
- `pkg/apperr/`: centralized app error codes/messages and HTTP mapping.
- `pkg/scripts/`: migration/seed orchestration logic.
- `pkg/seeders/`: seed data logic (bootstrap/default records).


When adding a new backend domain model:

1. Add/extend GORM struct in `pkg/models/`.
2. Add a new SQL migration in `migrations/` to create required table/indexes.
3. Wire repository/service/controller changes as needed.

When changing an existing model schema:

1. Update the struct in `pkg/models/`.
2. Add a new migration for schema evolution (ALTER/transform/copy-rename strategy).
3. Do not rewrite already-applied migration files unless explicitly requested.

Seeder guideline:

- Add or update files in `pkg/seeders/` when new model fields or default data are required.
- Keep seeding idempotent (safe to run multiple times without creating duplicates).

## Default Workflow

Copy this checklist and keep it updated while working:

```text
Backend Delivery Progress
- [ ] 1) Understand request and inspect impacted backend modules
- [ ] 2) Implement code changes
- [ ] 3) Add/update migrations when schema changes
- [ ] 4) Update backend docs by router/function with JSON input/output contracts
- [ ] 5) Create/update Postman collection examples
- [ ] 6) Run backend validation (fmt/build/test)
- [ ] 7) Summarize changes, test evidence, and follow-ups
```

## Implementation Rules

1. Keep changes minimal and focused on the requested behavior.
2. Follow existing project conventions (naming, structure, error handling).
3. If DB schema changes, add a new migration file; do not rewrite old migration history unless explicitly requested.
4. Keep API response formats consistent with existing serializers/contracts.
5. If auth/claims/user ID types change, update all affected layers (model, repo, service, controller, middleware, serializers, token utilities).
6. For business/domain errors, use `pkg/apperr` instead of ad-hoc raw errors in controllers/services.
7. Standardize error flow: create/wrap with `apperr.E(...)`, map to response via existing serializer/error mapping.

## Documentation Rules

When behavior, API, config, or migration flow changes, update docs in the same task:

- Update run instructions if commands changed.
- Document any new env/config requirements.
- Add API request/response examples for changed endpoints.
- Keep docs concise and action-oriented.

### Router/Function-Based API Documentation (Required)

For every new/changed endpoint, document it by router domain and function intent (for example: `users`, `social`, `auth`). The goal is that frontend can implement directly from docs without reading backend code.

Preferred folder layout (do not keep all routes in one file/folder):

- `docs/backend-api/README.md` (index page)
- `docs/backend-api/<router>/README.md` (router overview)
- `docs/backend-api/<router>/<feature>.md` (one file per feature/endpoint group)

Example:

- `docs/backend-api/users/profile.md`
- `docs/backend-api/users/search.md`
- `docs/backend-api/social/follow.md`
- `docs/backend-api/social/block.md`

If the project has no `docs/backend-api/` yet, create it and migrate new docs there. Root `README.md` can keep only high-level links.

Each endpoint doc must include:

1. Method + path (for example `POST /api/v1/users`).
2. Purpose/behavior in 1-2 lines.
3. Auth requirement (`public` or `Bearer token`).
4. Request headers (if required).
5. Path params/query params/body schema.
6. JSON request example.
7. Success response JSON example(s).
8. Error response JSON example(s) mapped to app/domain errors.
9. Notes for frontend (validation rules, nullable fields, pagination/cursor semantics, id format).

Use this template for every route:

~~~md
### <ROUTER>: <FEATURE NAME>

- Method: `<HTTP_METHOD>`
- Path: `<PATH>`
- Auth: `<public|Bearer token>`
- Description: <short behavior>

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}` (if protected)
- Path params:
  - `<name>`: `<type>` - <description>
- Query params:
  - `<name>`: `<type>` - <description>
- Body JSON:

```json
{
  "fieldA": "value",
  "fieldB": 123
}
```

#### Success Response

- Status: `<200|201|...>`

```json
{
  "data": {},
  "message": "success"
}
```

#### Error Responses

- Status: `<400|401|403|404|409|500>`
- Meaning: `<when this error happens>`

```json
{
  "error": {
    "code": "ERR_CODE",
    "message": "human readable message"
  }
}
```

#### Frontend Notes

- <validation rules / edge cases / optional fields / pagination behavior>
~~~

Documentation quality rules:

- Keep field names exactly aligned with serializer/request struct JSON tags.
- Mark optional/nullable fields explicitly.
- If response envelope differs by router, show exact envelope shape used by that router.
- Provide at least one realistic success example and one realistic failure example per endpoint.
- For list endpoints, include pagination query + response metadata examples.
- When an endpoint changes, update docs in the same commit/task (no deferred docs).
- Keep each router in its own folder and each major feature in its own markdown file (avoid one giant API doc file).

## Postman Documentation Rules

When endpoints are created or changed:

1. Ensure `docs/postman/` exists.
2. Create or update `goportal.postman_collection.json` with:
   - Request method and URL (`{{base_url}}/...`)
   - Required headers
   - Request body example (if needed)
   - Example success/error responses in descriptions
3. Add or update environment file with at least:
   - `base_url` (for example: `http://localhost:8080`)
   - `token` (empty by default for authenticated routes)
4. Keep collection names and folder grouping aligned with route domains (auth, users, etc.).
5. Ensure examples in Postman match the same request/response contracts documented in router-based docs.
6. If the collection becomes large, split maintenance sources by router (for example, one exported collection per domain) and keep one merged collection for delivery.

## Validation Commands (Backend)

Run from `backend/` unless the task explicitly says otherwise:

```bash
go fmt ./...
go build ./...
go test ./...
go run . -config configs/config.yaml -migrate
```

Migration execution is part of default backend validation. Always attempt migration run and report result.

If seed behavior changed:

```bash
go run . -config configs/config.yaml -migrate -seed
```

## Final Response Format

Report results in this order:

1. What was changed (code + migrations + docs + Postman).
2. Validation commands executed and outcomes.
3. Any known limitations or follow-up actions.

