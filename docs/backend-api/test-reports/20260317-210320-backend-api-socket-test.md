# Backend API + Socket Test Report

- Timestamp: 2026-03-17T21:03:20.649638+07:00
- Base URL: http://localhost:8080
- WS URL: ws://localhost:8090/ws?user_id=<USER_ID>&token=<TOKEN>
- Docs scope: docs/backend-api/auth, servers, channels, messages
- Backend commit/ref: bc1b074

## Summary

- Total HTTP steps: 10
- HTTP Passed: 10
- HTTP Failed: 0
- Socket checks: 2
- Socket Passed: 2
- Socket Failed: 0

## Environment

- Docker deps: mysql, notification-redis, notification-rabbitmq
- Backend command: `go run . -config configs/config.yaml -migrate`
- Notification command: `PORT=8090 WS_PATH=/ws REDIS_ADDR=localhost:6379 RABBITMQ_URL='amqp://guest:guest@localhost:5672/' TOPIC_NOTIFICATIONS=notification_topic TOPIC_DLQ=notifications.dlq go run ./cmd/notification-server`
- WS client: Python websockets client (equivalent role to wscat/websocat)

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

### 6) add_u2_membership_db
- HTTP Endpoint: `DB server_members insert`
- Expected HTTP: `0`
- Actual HTTP: `0`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: u2 joined server via DB insert

### 7) create_channel
- HTTP Endpoint: `POST /api/v1/servers/5810b18a-1b9e-40a0-82dd-1e2ce23cd38d/channels`
- Expected HTTP: `201`
- Actual HTTP: `201`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: Channel created

### 8) message_by_u1
- HTTP Endpoint: `POST /api/v1/messages`
- Expected HTTP: `201`
- Actual HTTP: `201`
- Expected Socket: `POPUP event delivered`
- Actual Socket: `POPUP x4`
- Result: PASS
- Notes: Message created

### 9) message_by_u2
- HTTP Endpoint: `POST /api/v1/messages`
- Expected HTTP: `201`
- Actual HTTP: `201`
- Expected Socket: `POPUP event delivered`
- Actual Socket: `POPUP x4`
- Result: PASS
- Notes: Message created

### 10) list_messages_u2
- HTTP Endpoint: `GET /api/v1/channels/40cac224-6ba7-47d0-baa8-b23d5c77c1ea/messages?limit=20&offset=0`
- Expected HTTP: `200`
- Actual HTTP: `200`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: Messages fetched

### 11) react_u2_on_u1_message
- HTTP Endpoint: `POST /api/v1/messages/03a24dd9-8a8b-47e9-ae6c-fdb3c280b207/reactions`
- Expected HTTP: `200`
- Actual HTTP: `200`
- Expected Socket: `n/a`
- Actual Socket: `n/a`
- Result: PASS
- Notes: Reaction added

## Socket Transcript Highlights

```text
2026-03-17T14:03:21.066012+00:00 U1 OPEN ws://localhost:8090/ws?user_id=6c12cec2-6067-447b-b5a3-c46f58f4379e&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNmMxMmNlYzItNjA2Ny00NDdiLWI1YTMtYzQ2ZjU4ZjQzNzllIiwidXNlcm5hbWUiOiJjdXJsLXNvY2tldC1hLTIwMjYwM...
2026-03-17T14:03:21.082767+00:00 U2 OPEN ws://localhost:8090/ws?user_id=cd75ec8b-32d5-4853-b00f-9de19d07800f&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiY2Q3NWVjOGItMzJkNS00ODUzLWIwMGYtOWRlMTlkMDc4MDBmIiwidXNlcm5hbWUiOiJjdXJsLXNvY2tldC1iLTIwMjYwM...
2026-03-17T14:03:21.086241+00:00 U1 MSG {"type":"CONNECTED","user_id":"6c12cec2-6067-447b-b5a3-c46f58f4379e","payload":{"status":"ok"},"priority":"NORMAL","timestamp":"2026-03-17T14:03:21Z"}

2026-03-17T14:03:21.086313+00:00 U2 MSG {"type":"CONNECTED","user_id":"cd75ec8b-32d5-4853-b00f-9de19d07800f","payload":{"status":"ok"},"priority":"NORMAL","timestamp":"2026-03-17T14:03:21Z"}

2026-03-17T14:03:23.125683+00:00 U1 MSG {"type":"POPUP","user_id":"6c12cec2-6067-447b-b5a3-c46f58f4379e","payload":{"attachments":null,"author_id":"6c12cec2-6067-447b-b5a3-c46f58f4379e","channel_id":"40cac224-6ba7-47d0-baa8-b23d5c77c1ea","content":{"encoding":...
2026-03-17T14:03:23.149899+00:00 U2 MSG {"type":"POPUP","user_id":"cd75ec8b-32d5-4853-b00f-9de19d07800f","payload":{"attachments":null,"author_id":"6c12cec2-6067-447b-b5a3-c46f58f4379e","channel_id":"40cac224-6ba7-47d0-baa8-b23d5c77c1ea","content":{"encoding":...
2026-03-17T14:03:24.146882+00:00 U1 MSG {"type":"POPUP","user_id":"6c12cec2-6067-447b-b5a3-c46f58f4379e","payload":{"attachments":null,"author_id":"cd75ec8b-32d5-4853-b00f-9de19d07800f","channel_id":"40cac224-6ba7-47d0-baa8-b23d5c77c1ea","content":{"encoding":...
2026-03-17T14:03:24.175648+00:00 U2 MSG {"type":"POPUP","user_id":"cd75ec8b-32d5-4853-b00f-9de19d07800f","payload":{"attachments":null,"author_id":"cd75ec8b-32d5-4853-b00f-9de19d07800f","channel_id":"40cac224-6ba7-47d0-baa8-b23d5c77c1ea","content":{"encoding":...
```

## Findings

- Two users in same server/channel both created messages successfully.
- POPUP websocket events were delivered to both connected users after each message create.

## Next Actions

- Add edit/delete message assertions and negative cases in next run.
