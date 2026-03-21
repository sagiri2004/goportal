### CHANNELS: Create Channel

- Method: `POST`
- Path: `/api/v1/servers/:id/channels`
- Auth: `Bearer token`
- Description: Create a channel. Caller must have `MANAGE_CHANNELS` (or `ADMINISTRATOR`).

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Body JSON:

```json
{
  "name": "general",
  "type": "TEXT",
  "parent_id": null,
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
    "type": "TEXT",
    "name": "general",
    "position": 0,
    "is_private": false
  }
}
```

---

### CHANNELS: Get Channel

- Method: `GET`
- Path: `/api/v1/channels/:id`
- Auth: `Bearer token`
- Description: Fetch channel by ID. Access is resolved from server roles + channel overwrites and private-member gate.

---

### CHANNELS: Update Channel Position

- Method: `PATCH`
- Path: `/api/v1/channels/:id/position`
- Auth: `Bearer token`
- Description: Update sort position of channel among siblings.

---

### CHANNELS: Update Privacy

- Method: `PATCH`
- Path: `/api/v1/channels/:id/privacy`
- Auth: `Bearer token`
- Description: Set `is_private` for channel.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Body JSON:

```json
{
  "is_private": true
}
```

---

### CHANNELS: Add Member

- Method: `POST`
- Path: `/api/v1/channels/:id/members`
- Auth: `Bearer token`
- Description: Add server member to channel (`MANAGE_CHANNELS` required).

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Body JSON:

```json
{
  "user_id": "66a2f8be-3055-4e11-a987-0f3dbe6dd8d1"
}
```

---

### CHANNELS: List Members

- Method: `GET`
- Path: `/api/v1/channels/:id/members`
- Auth: `Bearer token`
- Description: List explicit members for channel access.

---

### CHANNELS: Remove Member

- Method: `DELETE`
- Path: `/api/v1/channels/:id/members/:userId`
- Auth: `Bearer token`
- Description: Remove channel member.

---

### CHANNELS: Upsert Overwrite

- Method: `PUT`
- Path: `/api/v1/channels/:id/overwrites`
- Auth: `Bearer token`
- Description: Upsert allow/deny bit overwrite by `subject_type` (`ROLE|USER`) and `subject_id`.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Body JSON:

```json
{
  "subject_type": "ROLE",
  "subject_id": "1ae79d12-b2d4-4f0f-b6b6-2e09e87f4dd4",
  "allow_bits": 1,
  "deny_bits": 2
}
```

---

### CHANNELS: List Overwrites

- Method: `GET`
- Path: `/api/v1/channels/:id/overwrites`
- Auth: `Bearer token`
- Description: List all overwrite rows for channel.

---

### CHANNELS: Delete Overwrite

- Method: `DELETE`
- Path: `/api/v1/channels/:id/overwrites/:subjectType/:subjectId`
- Auth: `Bearer token`
- Description: Delete overwrite row for target subject.

---

### CHANNELS: Mark Channel Read

- Method: `POST`
- Path: `/api/v1/channels/:id/read`
- Auth: `Bearer token`
- Description: Mark current channel as read for the current user (`unread_count=0`, update `last_read_at`).

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Channel UUID.
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
  "message": "Channel read state updated",
  "data": null
}
```

---

### CHANNELS: Get Notification Setting

- Method: `GET`
- Path: `/api/v1/channels/:id/notification-settings`
- Auth: `Bearer token`
- Description: Get current user's notification level for a channel.

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Notification setting fetched",
  "data": {
    "user_id": "66a2f8be-3055-4e11-a987-0f3dbe6dd8d1",
    "channel_id": "12bb9026-4dfb-49f2-9035-bc2eb67f7f0a",
    "level": "all",
    "muted_until": null
  }
}
```

---

### CHANNELS: Update Notification Setting

- Method: `PUT`
- Path: `/api/v1/channels/:id/notification-settings`
- Auth: `Bearer token`
- Description: Update current user's notification level for a channel.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Body JSON:

```json
{
  "level": "mentions_only",
  "muted_until": "2026-03-22T10:00:00Z"
}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Notification setting updated",
  "data": {
    "user_id": "66a2f8be-3055-4e11-a987-0f3dbe6dd8d1",
    "channel_id": "12bb9026-4dfb-49f2-9035-bc2eb67f7f0a",
    "level": "mentions_only",
    "muted_until": "2026-03-22T10:00:00Z"
  }
}
```

#### Frontend Notes

- Channel effective permission order: base server role perms -> `@everyone` overwrite -> role overwrites -> user overwrite.
- Private channel requires membership unless caller has `ADMINISTRATOR`.
