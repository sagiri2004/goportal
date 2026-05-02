# Game Realtime Service

WebSocket service tach rieng cho game realtime, tieu thu su kien `game.room.events` tu RabbitMQ va day ve client.

## Chuc nang

- WebSocket endpoint rieng: `/ws/game`
- Xac thuc bang JWT (`token` query hoac `Authorization: Bearer`)
- Subscribe theo room (`subscribe.room` / `unsubscribe.room`)
- Consume topic `game.room.events` va fan-out den user trong room

## Chay local (docker compose)

Service duoc add trong `docker-compose.yml` voi port `8091`.

WS endpoint mac dinh:

`ws://localhost:8091/ws/game?token=<jwt>`

## Message tu client

```json
{ "type": "subscribe.room", "room_id": "room-uuid" }
```

```json
{ "type": "unsubscribe.room", "room_id": "room-uuid" }
```

## Message tu server

```json
{
  "type": "game.room.event",
  "event_id": "uuid",
  "timestamp": "2026-05-03T00:00:00Z",
  "payload": {
    "event_type": "GAME_ROOM_STATE_UPDATED",
    "game_id": "game-uuid",
    "room_id": "room-uuid",
    "state_version": 12
  }
}
```
