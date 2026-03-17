### CHANNELS: Create Channel

- Method: `POST`
- Path: `/api/v1/servers/:id/channels`
- Auth: `Bearer token`
- Description: Create a channel in a server. Caller must be a server member.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Server UUID.
- Query params:
  - None
- Body JSON:

```json
{
  "name": "general",
  "type": "TEXT",
  "parent_id": "f0344e7b-6f84-45c4-b5b8-58a06f34ee87",
  "position": 0
}
```

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "Channel created",
  "data": {
    "id": "a9f4c1ba-6e28-4cb9-a51f-53fcd7f0f3bb",
    "server_id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
    "parent_id": "f0344e7b-6f84-45c4-b5b8-58a06f34ee87",
    "type": "TEXT",
    "name": "general",
    "position": 0
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: Invalid channel type, invalid parent category, or invalid position.

```json
{
  "success": false,
  "code": "CHANNEL_TYPE_INVALID",
  "message": "Invalid channel type"
}
```

- Status: `403`
- Meaning: Caller is not a member of the server.

```json
{
  "success": false,
  "code": "NOT_SERVER_MEMBER",
  "message": "You are not a member of this server"
}
```

#### Frontend Notes

- Supported `type`: `TEXT`, `VOICE`, `CATEGORY`.
- For `CATEGORY` type, `parent_id` is ignored and set to `null`.
- If `position` is omitted, backend appends channel to end of sibling list.

---

### CHANNELS: Get Channel

- Method: `GET`
- Path: `/api/v1/channels/:id`
- Auth: `Bearer token`
- Description: Fetch a channel by ID. Caller must be a member of the channel's server.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Channel UUID.
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
  "message": "Channel fetched",
  "data": {
    "id": "a9f4c1ba-6e28-4cb9-a51f-53fcd7f0f3bb",
    "server_id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
    "parent_id": "f0344e7b-6f84-45c4-b5b8-58a06f34ee87",
    "type": "TEXT",
    "name": "general",
    "position": 0
  }
}
```

#### Error Responses

- Status: `403`
- Meaning: Caller is not a member of the server.

```json
{
  "success": false,
  "code": "NOT_SERVER_MEMBER",
  "message": "You are not a member of this server"
}
```

- Status: `404`
- Meaning: Channel does not exist.

```json
{
  "success": false,
  "code": "CHANNEL_NOT_FOUND",
  "message": "Channel not found"
}
```

#### Frontend Notes

- `parent_id` is nullable.
- Useful for resolving channel metadata before rendering nested trees.

---

### CHANNELS: Update Channel Position

- Method: `PATCH`
- Path: `/api/v1/channels/:id/position`
- Auth: `Bearer token`
- Description: Update channel `position` value for sorting among sibling channels.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Channel UUID.
- Query params:
  - None
- Body JSON:

```json
{
  "position": 2
}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Channel position updated",
  "data": {
    "id": "a9f4c1ba-6e28-4cb9-a51f-53fcd7f0f3bb",
    "server_id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
    "parent_id": "f0344e7b-6f84-45c4-b5b8-58a06f34ee87",
    "type": "TEXT",
    "name": "general",
    "position": 2
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: Position is negative.

```json
{
  "success": false,
  "code": "INVALID_POSITION",
  "message": "Invalid channel position"
}
```

#### Frontend Notes

- Position is an integer and can be used for manual drag-and-drop ordering.
- Backend currently updates only this channel value; client can send batched updates endpoint-by-endpoint.
