# Scaling and Redis Strategy

## Horizontal Scaling Model

The Notification Server is designed as a **stateless, multi-node service**:

- Any node can consume broker events.
- Any node can accept WebSocket connections.
- Connection ownership is tracked in Redis, not in process memory alone.

This model enables:

- Rolling deployments without global downtime.
- Dynamic scaling based on active socket count and event throughput.
- Cross-node message delivery without sticky session requirements.

## Connection Routing Data Model in Redis

Redis stores which user is connected to which notification node.

### Recommended Keys

| Key Pattern | Type | Example | Purpose |
|---|---|---|---|
| `presence:user:{user_id}` | String/Hash | `presence:user:123` | Maps user to owning `server_id` and optional `connection_id`. |
| `presence:server:{server_id}:users` | Set | `presence:server:notif-node-a:users` | Tracks users currently connected to a node. |
| `notify:{server_id}` | Pub/Sub channel | `notify:notif-node-b` | Receives forwarded notifications for that node. |

### Suggested Value Shape (`presence:user:{user_id}`)

```json
{
  "server_id": "notif-node-a",
  "connection_id": "ws_9f3ab1",
  "connected_at": "2026-03-17T10:29:04Z"
}
```

Use TTL or heartbeat-driven refresh to remove stale records from abrupt disconnects.

## Notification Delivery Decision

When a Watermill handler processes an event for `target_user_id`:

1. Read `presence:user:{user_id}` from Redis.
2. If key is missing, treat user as offline.
3. If `server_id` equals current node:
   - send directly to in-memory WebSocket connection map.
4. If `server_id` is different:
   - publish normalized payload to `notify:{server_id}`.
5. Owning node receives Pub/Sub message and pushes to local WebSocket connection.

## Cross-Node Broadcast Mechanism

### Why Pub/Sub

Redis Pub/Sub provides low-latency forwarding between notification nodes:

- Minimal serialization overhead.
- Immediate fan-out to subscribed nodes.
- No direct node-to-node RPC coupling.

### Flow for Remote User Delivery

```text
Node A receives event -> checks Redis presence -> sees user on Node B
Node A PUBLISH notify:notif-node-b {message}
Node B SUBSCRIBE handler receives message
Node B pushes payload to user's WebSocket connection
```

## Broadcast vs Targeted Delivery

| Mode | Redis Channel Pattern | Use Case |
|---|---|---|
| Targeted user delivery | `notify:{server_id}` | Send one user's notification to owning node. |
| Global system broadcast | `notify:broadcast` | Deliver `SYSTEM_ALERT` to all connected users across nodes. |

For global broadcasts:

1. Publish once to `notify:broadcast`.
2. Every node subscribed to broadcast channel sends to its local user connections.

## Consistency and Failure Scenarios

| Scenario | Behavior | Mitigation |
|---|---|---|
| Node crashes before cleanup | Stale presence record remains. | TTL + heartbeat refresh + cleanup on reconnect. |
| Redis temporary outage | Routing lookup fails. | Retry policy + circuit breaker + fallback queue. |
| Duplicate broker delivery | User may receive duplicate notification. | Use `event_id` dedupe at node and/or client. |
| Reconnect race | Presence may point to old node briefly. | Last-write-wins with monotonic timestamp checks. |

## Operational Recommendations

- Track metrics: active sockets per node, Pub/Sub lag, delivery success rate, dropped events.
- Use structured logs with `event_id`, `user_id`, `server_id`, `connection_id`.
- Capacity plan by:
  - max sockets per node,
  - average messages/sec,
  - peak burst handling at broker and Redis levels.
- Keep Redis in highly available mode (sentinel/cluster based on scale).
