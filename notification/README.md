# Notification Server

High-performance Notification Server built with Go, Watermill, Redis, and WebSockets.

## Features

- WebSocket manager using `gorilla/websocket`
- Heartbeat Ping/Pong cleanup for dead connections
- Watermill consumer for `notifications` topic
- Redis presence mapping (`user_presence:{user_id} -> server_id`)
- Redis Pub/Sub for distributed cross-node delivery (`notify:{server_id}`)
- Dead Letter Queue topic for offline users (`notifications.dlq`)
- Graceful shutdown with signal handling

## Run locally

```bash
docker compose up -d --build
```

WebSocket endpoint:

`ws://localhost:8085/ws?user_id=123`
