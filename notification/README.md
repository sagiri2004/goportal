# Notification Server

High-performance Notification Server built with Go, Watermill, Redis, and WebSockets.

## Features

- WebSocket manager using `gorilla/websocket`
- Heartbeat Ping/Pong cleanup for dead connections
- Watermill consumer for `notification.dispatch.request` topic
- Delivery receipt publisher to `notification.dispatch.receipt`
- Redis presence mapping (`user_presence:{user_id} -> server_id`)
- Redis Pub/Sub for distributed cross-node delivery (`notify:{server_id}`)
- Dead Letter Queue topic for offline users (`notification.dispatch.dlq`)
- Graceful shutdown with signal handling

## Run locally

```bash
docker compose -f ../docker-compose.yml up -d --build notification-server redis rabbitmq
```

WebSocket endpoint:

`ws://localhost:8085/ws?user_id=123`
