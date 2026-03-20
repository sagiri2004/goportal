### ROLES: List Roles

- Method: `GET`
- Path: `/api/v1/servers/:id/roles`
- Auth: `Bearer token`
- Description: List roles in a server. `@everyone` is returned with `is_everyone: true`.

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Roles fetched",
  "data": [
    {
      "id": "51597501-fcd3-4fe1-9a43-d2264a6446f0",
      "server_id": "d65bdaa2-0805-4067-b101-059ea536a422",
      "name": "owner",
      "color": "#ED4245",
      "position": 100,
      "is_everyone": false,
      "permissions": ["ADMINISTRATOR"]
    },
    {
      "id": "47645438-f4f1-4fd6-a83b-09de8a4a095a",
      "server_id": "d65bdaa2-0805-4067-b101-059ea536a422",
      "name": "@everyone",
      "color": "#99AAB5",
      "position": 0,
      "is_everyone": true,
      "permissions": ["READ_MESSAGES", "SEND_MESSAGES", "VIEW_CHANNEL"]
    }
  ]
}
```

---

### ROLES: Create Role

- Method: `POST`
- Path: `/api/v1/servers/:id/roles`
- Auth: `Bearer token`
- Description: Create a role. Caller must have `MANAGE_ROLES`. Position is auto-assigned.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Server UUID.
- Body JSON:

```json
{
  "name": "Designer",
  "color": "#00AAFF",
  "permissions": ["VIEW_CHANNEL", "SEND_MESSAGES"]
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
    "id": "b1c369b3-2b86-4ffc-a10b-86d57dd59553",
    "server_id": "d65bdaa2-0805-4067-b101-059ea536a422",
    "name": "Designer",
    "color": "#00AAFF",
    "position": 81,
    "is_everyone": false,
    "permissions": ["SEND_MESSAGES", "VIEW_CHANNEL"]
  }
}
```

---

### ROLES: Update Role

- Method: `PATCH`
- Path: `/api/v1/servers/:id/roles/:roleId`
- Auth: `Bearer token`
- Description: Update role `name`, `color`, `permissions`. Position cannot be edited here.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Server UUID.
  - `roleId`: `string` - Role UUID.
- Body JSON:

```json
{
  "name": "Designer+",
  "color": "#FF5500",
  "permissions": ["VIEW_CHANNEL"]
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
    "id": "b1c369b3-2b86-4ffc-a10b-86d57dd59553",
    "server_id": "d65bdaa2-0805-4067-b101-059ea536a422",
    "name": "Designer+",
    "color": "#FF5500",
    "position": 81,
    "is_everyone": false,
    "permissions": ["VIEW_CHANNEL"]
  }
}
```

---

### ROLES: Delete Role

- Method: `DELETE`
- Path: `/api/v1/servers/:id/roles/:roleId`
- Auth: `Bearer token`
- Description: Delete a role. Caller must have `MANAGE_ROLES`.

#### Error Responses

- Status: `400`
- Meaning: Trying to delete `@everyone`.

```json
{
  "success": false,
  "code": "DEFAULT_ROLE_DELETE_FORBIDDEN",
  "message": "Cannot delete @everyone role"
}
```

---

### Permission Enum Values

Use these exact strings:

- `VIEW_CHANNEL`
- `SEND_MESSAGES`
- `READ_MESSAGES`
- `ADMINISTRATOR`
- `MANAGE_SERVER`
- `CREATE_INVITE`
- `READ_MESSAGE_HISTORY`
- `MANAGE_MESSAGES`
- `ATTACH_FILES`
- `EMBED_LINKS`
- `ADD_REACTIONS`
- `MANAGE_CHANNELS`
- `MANAGE_ROLES`
- `KICK_MEMBERS`
- `BAN_MEMBERS`
- `APPROVE_MEMBERS`

