# Notification Server Setup Guide

## Prerequisites

Install the following tooling before running the stack:

| Tool | Recommended Version | Purpose |
|---|---|---|
| Go | `1.22+` | Build and run Notification Server. |
| Docker | `24+` | Container runtime for local infrastructure. |
| Docker Compose | `v2+` | Multi-service orchestration. |
| Redis | `7+` (via Docker) | Presence tracking and Pub/Sub routing. |
| Kafka or RabbitMQ | Kafka `3+` / RabbitMQ `3.13+` | Event broker for incoming notifications. |

Optional but useful:

- `make` for command shortcuts.
- `jq` for JSON inspection.
- WebSocket client (`wscat`, browser devtools, or app frontend).

## Project Structure (Expected)

```text
doc/notification-api/
docker-compose.yml
notification-server/
  cmd/
  internal/
  .env
```

> Adjust paths if your repository uses a different layout.

## Environment Configuration

Create a `.env` file for the notification service.

### Example `.env`

```bash
# App
APP_NAME=notification-server
APP_ENV=local
PORT=8085
SERVER_ID=notif-node-a
LOG_LEVEL=debug

# WebSocket
WS_PATH=/ws
WS_PING_INTERVAL=25s
WS_PONG_TIMEOUT=10s
WS_WRITE_TIMEOUT=5s

# Redis
REDIS_ADDR=redis:6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_PREFIX=notif

# Broker selection: kafka | rabbitmq
BROKER_DRIVER=kafka

# Kafka
KAFKA_BROKERS=kafka:9092
KAFKA_TOPIC_NOTIFICATIONS=notification.dispatch.request.events
KAFKA_CONSUMER_GROUP=notification-server-group

# RabbitMQ (used when BROKER_DRIVER=rabbitmq)
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
RABBITMQ_QUEUE_NOTIFICATIONS=notification.dispatch.request.events
RABBITMQ_EXCHANGE=notification.dispatch.request

# Security
JWT_SECRET=replace-with-secure-secret
JWT_ISSUER=goportal
ALLOW_ORIGINS=http://localhost:3000
```

### Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | HTTP/WebSocket listening port. |
| `SERVER_ID` | Yes | Unique node ID used for Redis routing and Pub/Sub channels. |
| `REDIS_ADDR` | Yes | Redis address for presence and Pub/Sub. |
| `BROKER_DRIVER` | Yes | Selects message broker implementation (`kafka` or `rabbitmq`). |
| `KAFKA_BROKERS` | Kafka only | Comma-separated Kafka brokers. |
| `KAFKA_TOPIC_NOTIFICATIONS` | Kafka only | Topic consumed by Watermill. |
| `RABBITMQ_URL` | RabbitMQ only | RabbitMQ connection URI. |
| `RABBITMQ_QUEUE_NOTIFICATIONS` | RabbitMQ only | Queue name consumed by Watermill. |
| `WS_PING_INTERVAL` | Yes | Ping cadence to keep sockets alive. |
| `WS_PONG_TIMEOUT` | Yes | Max wait for pong before disconnect. |

## Running with Docker Compose

Use a compose file that includes:

- notification server
- redis
- kafka (+ zookeeper if required) **or** rabbitmq

### 1) Start Infrastructure

```bash
docker compose -f docker-compose.yml up -d redis rabbitmq
```

### 2) Start Notification Server

```bash
docker compose -f docker-compose.yml up -d notification-server
```

### 3) Verify Service Health

```bash
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs -f notification-server
```

### 4) Test WebSocket Connection

```bash
wscat -c "ws://localhost:8085/ws?user_id=123&token=<jwt>"
```

Expected behavior:

- Connection succeeds.
- `CONNECTED` event is received.
- Heartbeat ping/pong remains stable.

## Local Development (Without Docker for App)

You can run Redis and broker in Docker, but run app binary locally:

```bash
# Start infra
docker compose -f docker-compose.yml up -d redis rabbitmq

# Run app
go run ./cmd/notification-server
```

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---|---|---|
| WebSocket immediately closes | Invalid token or missing `user_id`. | Check query params and auth middleware logs. |
| Events consumed but not delivered | Missing Redis presence mapping. | Confirm connection registration and `SERVER_ID` value. |
| No events received from broker | Wrong topic/queue or consumer group mismatch. | Validate broker env vars and Watermill subscription config. |
| Cross-node forwarding fails | Pub/Sub channel mismatch. | Ensure publish/subscribe naming is `notify:{server_id}`. |
| Duplicate notifications | At-least-once broker semantics. | Add event dedupe by `event_id`. |

## Production Readiness Checklist

- Enable TLS (`wss://`) and secure origin validation.
- Use strong JWT secrets and rotate credentials.
- Enable metrics and alerts (socket count, delivery failures, Redis latency).
- Configure autoscaling based on active connections and throughput.
- Set resource limits and graceful shutdown hooks for draining sockets.

## Goportal Backend Integration

The backend now initializes Watermill with RabbitMQ (AMQP) and runs the router in a separate goroutine from `main.go`.

### Implemented Components

- `pkg/initialize/watermill.go`: creates Watermill publisher/subscriber/router using RabbitMQ (AMQP).
- `pkg/global/global.go`: adds `Publisher` for service-level event publishing.
- `pkg/notification/`: registers and handles `new_message_topic`.
- `pkg/services/impl/message_service_impl.go`: persists message and publishes `MessageCreatedEvent`.
- `pkg/scripts/watermill_smoke.go`: publishes a smoke event to validate handler flow.

### Quick Verification

Run backend with smoke event publishing:

```bash
go run . -config configs/config.yaml -watermill-test
```

Expected log flow:

1. app starts and Watermill router runs
2. smoke event is published to `new_message_topic`
3. `NotificationHandler` consumes event and publishes `notification.dispatch.request`

Required backend config:

```yaml
rabbitmq:
  url: "amqp://guest:guest@localhost:5672/"
```
