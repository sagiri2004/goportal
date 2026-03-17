### ROLES: Create Role

- Method: `POST`
- Path: `/api/v1/servers/:id/roles`
- Auth: `Bearer token`
- Description: Create server role with explicit `position` and permission bits. Actor must have `MANAGE_ROLES`.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Server UUID.
- Body JSON:

```json
{
  "name": "moderator",
  "position": 50,
  "permissions": [1, 2, 4, 64, 128, 32]
}
```

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "Role created",
  "data": {
    "id": "6ff76833-6b8d-4fb9-83fd-4dedf07a10dd",
    "server_id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
    "name": "moderator",
    "position": 50,
    "permissions": 231
  }
}
```

---

### ROLES: Update Role

- Method: `PATCH`
- Path: `/api/v1/roles/:id`
- Auth: `Bearer token`
- Description: Update role display name and/or permission bitset.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Role UUID.
- Body JSON:

```json
{
  "name": "moderator",
  "position": 55,
  "permissions": [1, 2, 4, 64, 128, 32]
}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Role updated",
  "data": {
    "id": "6ff76833-6b8d-4fb9-83fd-4dedf07a10dd",
    "server_id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
    "name": "moderator",
    "position": 55,
    "permissions": 231
  }
}
```

#### Error Responses

- Status: `403`
- Meaning: Caller lacks `MANAGE_ROLES`, or tries to set role `position/permissions` above own authority.

```json
{
  "success": false,
  "code": "INSUFFICIENT_PERMISSION",
  "message": "Insufficient server permissions"
}
```

#### Frontend Notes

- `permissions` is an array of bit values; backend stores summed bitset.
- Role hierarchy is position-based: actor can only manage roles with lower `position`.
- Current base bit values:
  - `1` `VIEW_CHANNEL`
  - `2` `SEND_MESSAGES`
  - `4` `READ_MESSAGES`
  - `8` `ADMINISTRATOR`
  - `16` `MANAGE_SERVER`
  - `32` `CREATE_INVITE`
  - `64` `READ_MESSAGE_HISTORY`
  - `128` `MANAGE_MESSAGES`
  - `2048` `MANAGE_CHANNELS`
  - `4096` `MANAGE_ROLES`
  - `32768` `APPROVE_MEMBERS`
- Recommended common presets:
  - `@everyone`: view/read/send baseline
  - `moderator`: invite/manage-messages/approve-members
  - `admin`: administrator
