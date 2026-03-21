# Backend API + Socket Test Report

- Timestamp: 2026-03-17T20:29:47.971414+07:00
- Base URL: http://localhost:8080
- WS URL: ws://localhost:8085/ws?user_id=<USER_ID>&token=<TOKEN>
- Docs scope: docs/backend-api/auth, users, servers, channels, messages
- Backend commit/ref: bc1b074

## Summary

- Total HTTP steps: 12
- HTTP Passed: 12
- HTTP Failed: 0
- Socket checks: 1
- Socket Passed: 0
- Socket Failed: 1

## Environment

- Docker deps: mysql, notification-redis, notification-rabbitmq
- Backend command: `go run . -config configs/config.yaml -migrate`
- Notification command: `PORT=8090 ... go run ./cmd/notification-server`
- WS client: Node WebSocket (equivalent to wscat/websocat client role)

## Test Steps

### 1) register_u1
- HTTP Endpoint: `POST /api/v1/auth/register`
- Expected HTTP: `201`
- Actual HTTP: `201`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: User created

### 2) login_u1
- HTTP Endpoint: `POST /api/v1/auth/login`
- Expected HTTP: `200`
- Actual HTTP: `200`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: Login successful

### 3) register_u2
- HTTP Endpoint: `POST /api/v1/auth/register`
- Expected HTTP: `201`
- Actual HTTP: `201`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: User created

### 4) login_u2
- HTTP Endpoint: `POST /api/v1/auth/login`
- Expected HTTP: `200`
- Actual HTTP: `200`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: Login successful

### 5) create_server
- HTTP Endpoint: `POST /api/v1/servers`
- Expected HTTP: `201`
- Actual HTTP: `201`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: Server created

### 6) create_channel
- HTTP Endpoint: `POST /api/v1/servers/73a5b4c6-e6a8-453e-b43b-086eb94b9d53/channels`
- Expected HTTP: `201`
- Actual HTTP: `201`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: Channel created

### 7) message_by_u1
- HTTP Endpoint: `POST /api/v1/messages`
- Expected HTTP: `201`
- Actual HTTP: `201`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: Message created

### 8) message_by_u2_forbidden
- HTTP Endpoint: `POST /api/v1/messages`
- Expected HTTP: `403`
- Actual HTTP: `403`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: You are not a member of this server

### 9) list_messages_u1
- HTTP Endpoint: `GET /api/v1/channels/4a3a1e66-4b4f-459b-b5b3-88795719c7f8/messages?limit=20&offset=0`
- Expected HTTP: `200`
- Actual HTTP: `200`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: Messages fetched

### 10) edit_message_u1
- HTTP Endpoint: `PATCH /api/v1/messages/80030b35-d571-42e2-8fad-25a03bd0fb8b`
- Expected HTTP: `200`
- Actual HTTP: `200`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: Message updated

### 11) react_u1
- HTTP Endpoint: `POST /api/v1/messages/80030b35-d571-42e2-8fad-25a03bd0fb8b/reactions`
- Expected HTTP: `200`
- Actual HTTP: `200`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: Reaction added

### 12) react_u2_forbidden
- HTTP Endpoint: `POST /api/v1/messages/80030b35-d571-42e2-8fad-25a03bd0fb8b/reactions`
- Expected HTTP: `403`
- Actual HTTP: `403`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: You are not a member of this server

### 13) socket_event_after_message_by_u1
- HTTP Endpoint: `POST /api/v1/messages` (step: message_by_u1)
- Expected HTTP: `201`
- Actual HTTP: `201`
- Expected Socket: `U1 receives POPUP notification event`
- Actual Socket: `No POPUP event captured; only CONNECTED events`
- Result: FAIL
- Notes: Notification terminal repeatedly logged `inbound notification missing user_id`.

## Socket Transcript Highlights

```text
2026-03-17T13:28:28.241Z WS_START
2026-03-17T13:28:28.304Z U1 OPEN ws://localhost:8085/ws?user_id=bac574a0-12bd-4944-966e-3e5ba37b1f60&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmFjNTc0YTAtMTJiZC00OTQ0LTk2NmUtM2U1YmEzN2IxZjYwIiwidXNlcm5hbWUiOiJzb2NrYV8yMDI2MDMxNy0yMDI4MjciLCJyb2xlIjoidXNlciIsImV4cCI6MTc3Mzg0MDUwNywiaWF0IjoxNzczNzU0MTA3fQ.mgC15jubzy9p72ghDM2X6DXd1_nCh74PCTNTLMgja6M
2026-03-17T13:28:28.307Z U2 OPEN ws://localhost:8085/ws?user_id=670149e1-824b-416b-bb22-f18742212eaa&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjcwMTQ5ZTEtODI0Yi00MTZiLWJiMjItZjE4NzQyMjEyZWFhIiwidXNlcm5hbWUiOiJzb2NrYl8yMDI2MDMxNy0yMDI4MjciLCJyb2xlIjoidXNlciIsImV4cCI6MTc3Mzg0MDUwOCwiaWF0IjoxNzczNzU0MTA4fQ.iPSqE95wZUuPbSY0qx4xuZMOXoHZEa96VTSN589Hd6E
2026-03-17T13:28:28.308Z U1 MSG {"type":"CONNECTED","user_id":"bac574a0-12bd-4944-966e-3e5ba37b1f60","payload":{"status":"ok"},"priority":"NORMAL","timestamp":"2026-03-17T13:28:28Z"}
2026-03-17T13:28:28.308Z U2 MSG {"type":"CONNECTED","user_id":"670149e1-824b-416b-bb22-f18742212eaa","payload":{"status":"ok"},"priority":"NORMAL","timestamp":"2026-03-17T13:28:28Z"}
2026-03-17T13:28:53.304Z WS_END
```

## Findings

- HTTP contracts for tested auth/users/servers/channels/messages paths passed.
- Realtime socket delivery for message create did not pass.
- Notification server consumed event but handler rejected payload (`missing user_id`).

## Next Actions

- Align backend `NotificationEvent` payload with notification server expected inbound schema (`user_id`, `message_payload`, `priority`).
- Re-run socket test after schema fix and verify `POPUP` event delivered to U1 websocket.
