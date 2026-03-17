# Notification WebSocket API Specification

## Base Endpoint

- **Protocol**: `ws://` (local/dev), `wss://` (staging/production)
- **Path**: `/ws`
- **Example**: `/ws?user_id=123`

Recommended production query shape:

`/ws?user_id=123&token=<jwt>&client_version=1.2.0`

## Connection and Handshake

### Handshake Steps

1. Client opens WebSocket connection to `/ws` with required query params.
2. Server upgrades HTTP connection to WebSocket (`gorilla/websocket` upgrader).
3. Server validates:
   - `user_id` format
   - auth token (if enabled)
   - origin and protocol constraints
4. Server registers the connection and stores routing metadata in Redis.
5. Server sends a `CONNECTED` acknowledgment message.

### Handshake Failure Cases

| HTTP Status | Error Code | Cause |
|---|---|---|
| `400` | `INVALID_USER_ID` | Missing or malformed `user_id`. |
| `401` | `UNAUTHORIZED` | Token missing/invalid/expired. |
| `403` | `ORIGIN_NOT_ALLOWED` | Origin rejected by policy. |
| `503` | `SERVER_BUSY` | Instance cannot accept more sockets. |

## Endpoint Details

| Endpoint | Method | Description | Auth |
|---|---|---|---|
| `/ws` | `GET` (Upgrade) | Creates a persistent socket for realtime notifications. | Recommended (JWT or internal session). |

## Message Contract (Socket Level)

All server-to-client messages should include:

- `type`: event type name.
- `timestamp`: UTC ISO8601 generation time.
- `payload`: event-specific data.
- `meta`: tracing and source context.

## Event Types

| Event Type | Purpose | Common Use Case |
|---|---|---|
| `POPUP` | Immediate visible notification in UI. | New direct message, mention, urgent action. |
| `IN_APP_COUNT` | Counter update without intrusive popup. | Unread badge increments. |
| `SYSTEM_ALERT` | System-level broadcast or maintenance event. | Planned outage, policy update. |
| `CONNECTED` | Connection confirmation event. | Initial handshake acknowledgment. |
| `HEARTBEAT_ACK` | Optional explicit heartbeat response. | Monitoring connection health. |

### Example Event: `POPUP`

```json
{
  "type": "POPUP",
  "timestamp": "2026-03-17T10:31:22Z",
  "payload": {
    "title": "New message",
    "body": "Alice sent you a message",
    "action_url": "/inbox/room-42"
  },
  "meta": {
    "event_id": "evt_01HSX2PQ9YJX",
    "user_id": "123",
    "source": "chat-service"
  }
}
```

## Heartbeat Mechanism

Heartbeat keeps long-lived connections alive and detects dead peers quickly.

| Parameter | Default | Description |
|---|---|---|
| Ping Interval | `25s` | Server sends a WebSocket ping frame every 25 seconds. |
| Pong Timeout | `10s` | If no pong is received within 10 seconds, connection is closed. |
| Read Deadline | `35s` | Read deadline is extended on each pong or valid message. |
| Write Timeout | `5s` | Maximum time to write ping/data frame. |

### Heartbeat Behavior

- Server sends periodic `ping` control frames.
- Client must respond automatically with `pong` (most ws clients do this by default).
- If pong is missing past timeout:
  - connection is terminated,
  - Redis presence record is removed or expired.

## Client Integration Notes

- Reconnect with exponential backoff (`1s`, `2s`, `4s`, ... max `30s`).
- Re-authenticate on reconnect when tokens are short-lived.
- Treat duplicate events as possible; rely on `event_id` dedupe when needed.
- Handle out-of-order delivery for counters and eventually consistent state.
