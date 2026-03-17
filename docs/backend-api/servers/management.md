### SERVERS: Create Server

- Method: `POST`
- Path: `/api/v1/servers`
- Auth: `Bearer token`
- Description: Create a new server. The creator becomes server owner and first member.

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
  "name": "Backend Team"
}
```

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "Server created",
  "data": {
    "id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
    "name": "Backend Team",
    "owner_id": "7e034d77-91a3-4de7-a467-2ac8e954dc53"
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: Request body is invalid or missing required fields.

```json
{
  "success": false,
  "code": "INVALID_JSON",
  "message": "Invalid JSON payload"
}
```

#### Frontend Notes

- `name` length must be between 2 and 255 characters.
- All IDs are UUID strings.

---

### SERVERS: List Members

- Method: `GET`
- Path: `/api/v1/servers/:id/members`
- Auth: `Bearer token`
- Description: Return all members of a server. Caller must already be a server member.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Server UUID.
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
  "message": "Server members fetched",
  "data": [
    {
      "id": "7e034d77-91a3-4de7-a467-2ac8e954dc53",
      "username": "alice",
      "is_admin": false
    }
  ]
}
```

#### Error Responses

- Status: `403`
- Meaning: Authenticated user is not a member of the target server.

```json
{
  "success": false,
  "code": "NOT_SERVER_MEMBER",
  "message": "You are not a member of this server"
}
```

- Status: `404`
- Meaning: Server does not exist.

```json
{
  "success": false,
  "code": "SERVER_NOT_FOUND",
  "message": "Server not found"
}
```

#### Frontend Notes

- Response is sorted by `username` ascending.
- Returns an empty array when the server has no members.

---

### SERVERS: Delete Server

- Method: `DELETE`
- Path: `/api/v1/servers/:id`
- Auth: `Bearer token`
- Description: Delete a server. Only the server owner can perform this action.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Server UUID.
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
  "message": "Server deleted"
}
```

#### Error Responses

- Status: `403`
- Meaning: Authenticated user is not the owner.

```json
{
  "success": false,
  "code": "SERVER_OWNER_REQUIRED",
  "message": "Only server owner can perform this action"
}
```

#### Frontend Notes

- Deleting a server also removes its channels and membership records.

---

### SERVERS: Kick Member

- Method: `DELETE`
- Path: `/api/v1/servers/:id/members/:userId`
- Auth: `Bearer token`
- Description: Remove a member from a server. Only server owner can kick.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Server UUID.
  - `userId`: `string` - Target member user UUID.
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
  "message": "Member kicked"
}
```

#### Error Responses

- Status: `400`
- Meaning: Attempted to kick the owner.

```json
{
  "success": false,
  "code": "CANNOT_KICK_OWNER",
  "message": "You cannot kick the server owner"
}
```

- Status: `403`
- Meaning: Authenticated user is not the owner.

```json
{
  "success": false,
  "code": "SERVER_OWNER_REQUIRED",
  "message": "Only server owner can perform this action"
}
```

- Status: `404`
- Meaning: Target membership does not exist.

```json
{
  "success": false,
  "code": "SERVER_MEMBER_NOT_FOUND",
  "message": "Server member not found"
}
```

#### Frontend Notes

- `userId` must be a member of the same server.
- Server owner cannot be kicked.
