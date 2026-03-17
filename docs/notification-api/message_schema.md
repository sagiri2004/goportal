# Notification Message Schema

## Overview

This document defines:

1. **Incoming event schema** consumed from Watermill (broker message payload).
2. **Outgoing notification schema** sent to frontend clients over WebSocket.
3. Validation expectations and examples for each event type.

## 1) Incoming Schema (Watermill -> Notification Server)

Watermill handler receives broker messages, then deserializes JSON payloads into an internal event contract.

### JSON Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `event_id` | `string` | Yes | Unique event identifier for tracing and dedupe. |
| `event_type` | `string` | Yes | Domain event category (`POPUP`, `IN_APP_COUNT`, `SYSTEM_ALERT`). |
| `occurred_at` | `string (ISO8601)` | Yes | Event creation timestamp from producer. |
| `source_service` | `string` | Yes | Producer service name (e.g., `chat-service`). |
| `target_user_id` | `string` | Yes | Notification recipient user ID. |
| `priority` | `string` | No | `LOW`, `NORMAL`, `HIGH`, `CRITICAL`. |
| `payload` | `object` | Yes | Event-specific content. |
| `metadata` | `object` | No | Correlation and diagnostic fields. |

### Example Incoming Event (`POPUP`)

```json
{
  "event_id": "evt_01HSX2PQ9YJX",
  "event_type": "POPUP",
  "occurred_at": "2026-03-17T10:31:00Z",
  "source_service": "chat-service",
  "target_user_id": "123",
  "priority": "NORMAL",
  "payload": {
    "title": "New message",
    "body": "Alice mentioned you in #general",
    "action_url": "/chat/general"
  },
  "metadata": {
    "correlation_id": "corr_87213",
    "tenant_id": "acme"
  }
}
```

### Example Incoming Event (`IN_APP_COUNT`)

```json
{
  "event_id": "evt_01HSX2TQ4CVA",
  "event_type": "IN_APP_COUNT",
  "occurred_at": "2026-03-17T10:33:12Z",
  "source_service": "notification-aggregator",
  "target_user_id": "123",
  "payload": {
    "counter_name": "unread_notifications",
    "value": 27
  }
}
```

### Example Incoming Event (`SYSTEM_ALERT`)

```json
{
  "event_id": "evt_01HSX2XH6SNW",
  "event_type": "SYSTEM_ALERT",
  "occurred_at": "2026-03-17T10:36:48Z",
  "source_service": "ops-service",
  "target_user_id": "123",
  "priority": "HIGH",
  "payload": {
    "severity": "warning",
    "message": "Scheduled maintenance in 30 minutes",
    "starts_at": "2026-03-17T11:00:00Z"
  }
}
```

## 2) Outgoing Schema (Notification Server -> Frontend)

After validation and transformation, outgoing messages are normalized for frontend consumption.

### JSON Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `string` | Yes | Notification type for client routing logic. |
| `timestamp` | `string (ISO8601)` | Yes | Server delivery timestamp. |
| `payload` | `object` | Yes | Client-facing data. |
| `meta` | `object` | Yes | Delivery and tracing metadata. |
| `meta.event_id` | `string` | Yes | Original producer event ID. |
| `meta.user_id` | `string` | Yes | Recipient user ID. |
| `meta.source` | `string` | Yes | Original source service. |
| `meta.server_id` | `string` | Yes | Notification node handling delivery. |

### Example Outgoing Message (`POPUP`)

```json
{
  "type": "POPUP",
  "timestamp": "2026-03-17T10:31:22Z",
  "payload": {
    "title": "New message",
    "body": "Alice mentioned you in #general",
    "action_url": "/chat/general"
  },
  "meta": {
    "event_id": "evt_01HSX2PQ9YJX",
    "user_id": "123",
    "source": "chat-service",
    "server_id": "notif-node-a"
  }
}
```

### Example Outgoing Message (`IN_APP_COUNT`)

```json
{
  "type": "IN_APP_COUNT",
  "timestamp": "2026-03-17T10:33:13Z",
  "payload": {
    "counter_name": "unread_notifications",
    "value": 27
  },
  "meta": {
    "event_id": "evt_01HSX2TQ4CVA",
    "user_id": "123",
    "source": "notification-aggregator",
    "server_id": "notif-node-b"
  }
}
```

### Example Outgoing Message (`SYSTEM_ALERT`)

```json
{
  "type": "SYSTEM_ALERT",
  "timestamp": "2026-03-17T10:36:50Z",
  "payload": {
    "severity": "warning",
    "message": "Scheduled maintenance in 30 minutes",
    "starts_at": "2026-03-17T11:00:00Z"
  },
  "meta": {
    "event_id": "evt_01HSX2XH6SNW",
    "user_id": "123",
    "source": "ops-service",
    "server_id": "notif-node-a"
  }
}
```

## Validation and Compatibility Rules

- `event_id` must be non-empty and stable across retries.
- Unknown `event_type` should be rejected or routed to dead-letter handling.
- `target_user_id` must be normalized as string for consistent Redis keying.
- Timestamps should be UTC ISO8601.
- Frontend must ignore unknown fields for forward compatibility.
- Backend should preserve `meta` fields for observability.

## Error Handling Guidance

| Scenario | Recommended Action |
|---|---|
| Invalid JSON payload | NACK/retry depending on broker policy; send to dead-letter after max retries. |
| Missing required field | Reject event and log structured validation error with `event_id` if present. |
| Unsupported event type | Route to dead-letter topic/queue and alert owners. |
| Redis routing miss | Treat user as offline or use fallback strategy (store and forward). |

## 3) Delivery Receipt Schema (Notification Server -> Backend)

Backend should consume delivery receipt events to persist delivery status transitions.

### Topic

- `notification_delivery_topic`

### JSON Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `event_id` | `string` | Yes | Original notification event ID sent by backend. |
| `user_id` | `string` | Yes | Target user for the notification. |
| `server_id` | `string` | No | Notification Server node that handled delivery. |
| `delivery_type` | `string` | Yes | `DELIVERED_TO_SERVER`, `DELIVERED_TO_CLIENT`, or `FAILED`. |
| `delivered_at` | `number` | Yes | Unix timestamp for delivery processing. |
| `error_message` | `string` | No | Error reason when `delivery_type=FAILED`. |

### Example: Delivered to Notification Server

```json
{
  "event_id": "evt_01HSX2PQ9YJX",
  "user_id": "123",
  "server_id": "notif-node-a",
  "delivery_type": "DELIVERED_TO_SERVER",
  "delivered_at": 1773734101
}
```

### Example: Delivered to Client

```json
{
  "event_id": "evt_01HSX2PQ9YJX",
  "user_id": "123",
  "server_id": "notif-node-a",
  "delivery_type": "DELIVERED_TO_CLIENT",
  "delivered_at": 1773734103
}
```

### Example: Delivery Failed

```json
{
  "event_id": "evt_01HSX2PQ9YJX",
  "user_id": "123",
  "delivery_type": "FAILED",
  "delivered_at": 1773734105,
  "error_message": "connection not found"
}
```

### Backend Persistence Mapping

- `PENDING` -> initial DB state when notification record is created.
- `PUBLISHED` -> event successfully published to `notification_topic`.
- `DELIVERED_TO_SERVER` -> receipt from Notification Server acknowledged.
- `DELIVERED_TO_CLIENT` -> client socket delivery acknowledged.
- `FAILED` -> delivery pipeline failure.
