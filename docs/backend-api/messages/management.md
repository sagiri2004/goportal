### MESSAGES: List Channel Messages

- Method: `GET`
- Path: `/api/v1/channels/:id/messages`
- Auth: `Bearer token`
- Description: Fetch channel messages with pagination (`limit`, `offset`). Caller must be a server member.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Channel UUID.
- Query params:
  - `limit`: `number` - Optional, default `20`, max `100`.
  - `offset`: `number` - Optional, default `0`.
- Body JSON:

```json
{}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Messages fetched",
  "data": {
    "items": [
      {
        "id": "17f17742-f28f-4cf8-8b8a-8a2c6772553b",
        "channel_id": "12bb9026-4dfb-49f2-9035-bc2eb67f7f0a",
        "author_id": "66a2f8be-3055-4e11-a987-0f3dbe6dd8d1",
        "content": {
          "type": "text/plain",
          "payload": "hello world",
          "encoding": "utf-8"
        },
        "is_edited": false,
        "is_pinned": false,
        "created_at": 1773733801,
        "updated_at": 1773733801,
        "attachments": [],
        "reactions": []
      }
    ],
    "limit": 20,
    "offset": 0
  }
}
```

#### Error Responses

- Status: `403`
- Meaning: Caller is not server member.

```json
{
  "success": false,
  "code": "NOT_SERVER_MEMBER",
  "message": "You are not a member of this server"
}
```

#### Frontend Notes

- Messages are returned newest-first (`created_at DESC`).
- Use `limit`/`offset` for infinite scrolling.

---

### MESSAGES: Create Message

- Method: `POST`
- Path: `/api/v1/messages`
- Auth: `Bearer token`
- Description: Create a new message and publish `chat.message.created` event via Watermill.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - None
- Query params:
  - None
- Body JSON:

```json
{
  "channel_id": "12bb9026-4dfb-49f2-9035-bc2eb67f7f0a",
  "content_type": "text/plain",
  "content": "Hello channel",
  "encoding": "utf-8",
  "is_pinned": false,
  "attachment_ids": [
    "9dd2151d-a31f-4f33-b9f3-7a46a8092222"
  ]
}
```

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "Message created",
  "data": {
    "id": "17f17742-f28f-4cf8-8b8a-8a2c6772553b",
    "channel_id": "12bb9026-4dfb-49f2-9035-bc2eb67f7f0a",
    "author_id": "66a2f8be-3055-4e11-a987-0f3dbe6dd8d1",
    "content": {
      "type": "text/plain",
      "payload": "Hello channel",
      "encoding": "utf-8"
    },
    "is_edited": false,
    "is_pinned": false
  }
}
```

#### Error Responses

- Status: `403`
- Meaning: Caller is not server member.

```json
{
  "success": false,
  "code": "NOT_SERVER_MEMBER",
  "message": "You are not a member of this server"
}
```

#### Frontend Notes

- `content` is stored in envelope format: `type`, `payload`, `encoding`.
- `attachment_ids` must come from `POST /api/v1/upload`.

---

### MESSAGES: Edit Message

- Method: `PATCH`
- Path: `/api/v1/messages/:id`
- Auth: `Bearer token`
- Description: Update message content. Only message author can edit.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Message UUID.
- Query params:
  - None
- Body JSON:

```json
{
  "content_type": "text/plain",
  "content": "Edited content",
  "encoding": "utf-8"
}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Message updated",
  "data": {
    "id": "17f17742-f28f-4cf8-8b8a-8a2c6772553b",
    "is_edited": true
  }
}
```

#### Error Responses

- Status: `403`
- Meaning: Caller is not author of the message.

```json
{
  "success": false,
  "code": "MESSAGE_FORBIDDEN",
  "message": "You are not allowed to modify this message"
}
```

#### Frontend Notes

- Edit operation sets `is_edited=true`.

---

### MESSAGES: Delete Message (Soft Delete)

- Method: `DELETE`
- Path: `/api/v1/messages/:id`
- Auth: `Bearer token`
- Description: Soft delete message. Only author can delete.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Message UUID.
- Query params:
  - None
- Body JSON:

```json
{}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Message deleted"
}
```

#### Error Responses

- Status: `403`
- Meaning: Caller is not author of the message.

```json
{
  "success": false,
  "code": "MESSAGE_FORBIDDEN",
  "message": "You are not allowed to modify this message"
}
```

#### Frontend Notes

- Soft delete updates `deleted_at`; message is hidden from listing.

---

### MESSAGES: Toggle Reaction

- Method: `POST`
- Path: `/api/v1/messages/:id/reactions`
- Auth: `Bearer token`
- Description: Toggle emoji reaction on a message. Adds if missing, removes if existed.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Message UUID.
- Query params:
  - None
- Body JSON:

```json
{
  "emoji": "🔥"
}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Reaction added",
  "data": {
    "added": true
  }
}
```

#### Error Responses

- Status: `404`
- Meaning: Message not found.

```json
{
  "success": false,
  "code": "MESSAGE_NOT_FOUND",
  "message": "Message not found"
}
```

#### Frontend Notes

- Toggle behavior is idempotent for same `message_id + user_id + emoji`.
