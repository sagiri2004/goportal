### INVITES: Create Invite Link

- Method: `POST`
- Path: `/api/v1/servers/:id/invites`
- Auth: `Bearer token`
- Description: Create invite code for a server. Caller must have `CREATE_INVITE` or `ADMINISTRATOR`.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Server UUID.
- Body JSON:

```json
{
  "max_uses": 10,
  "expires_at": 1770000000
}
```

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "Invite created",
  "data": {
    "id": "4c77b3f3-aa4f-46f8-a249-e00991a1f2e4",
    "server_id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
    "inviter_id": "7e034d77-91a3-4de7-a467-2ac8e954dc53",
    "code": "91FD472FCB53",
    "max_uses": 10,
    "uses": 0,
    "expires_at": 1770000000
  }
}
```

#### Error Responses

- Status: `403`
- Meaning: Missing invite creation permissions.

```json
{
  "success": false,
  "code": "INSUFFICIENT_PERMISSION",
  "message": "Insufficient server permissions"
}
```

#### Frontend Notes

- `max_uses=0` means unlimited.
- `expires_at` is Unix seconds; omitted means no expiration.

---

### INVITES: Get Invite Info

- Method: `GET`
- Path: `/api/v1/invites/:code`
- Auth: `public`
- Description: Fetch invite metadata and target server summary.

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Invite fetched",
  "data": {
    "invite": {
      "id": "4c77b3f3-aa4f-46f8-a249-e00991a1f2e4",
      "server_id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
      "inviter_id": "7e034d77-91a3-4de7-a467-2ac8e954dc53",
      "code": "91FD472FCB53",
      "max_uses": 10,
      "uses": 1,
      "expires_at": 1770000000
    },
    "server": {
      "id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
      "name": "Backend Team",
      "owner_id": "7e034d77-91a3-4de7-a467-2ac8e954dc53",
      "is_public": true,
      "default_role_id": "1ae79d12-b2d4-4f0f-b6b6-2e09e87f4dd4"
    }
  }
}
```

#### Error Responses

- Status: `404`
- Meaning: Invite code does not exist.

```json
{
  "success": false,
  "code": "INVITE_NOT_FOUND",
  "message": "Invite not found"
}
```

---

### INVITES: Join By Invite Code

- Method: `POST`
- Path: `/api/v1/invites/:code/join`
- Auth: `Bearer token`
- Description: Join target server via invite and auto-assign default role.

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Joined server",
  "data": {
    "id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
    "name": "Backend Team",
    "owner_id": "7e034d77-91a3-4de7-a467-2ac8e954dc53",
    "is_public": true,
    "default_role_id": "1ae79d12-b2d4-4f0f-b6b6-2e09e87f4dd4"
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: Invite expired or max uses reached.

```json
{
  "success": false,
  "code": "INVITE_EXPIRED",
  "message": "Invite expired"
}
```

#### Frontend Notes

- Join operation is transactional: `server_members` and `server_member_role` are inserted atomically.
