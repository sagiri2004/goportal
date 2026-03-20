### SERVERS: Create Server

- Method: `POST`
- Path: `/api/v1/servers`
- Auth: `Bearer token`
- Description: Create server and bootstrap default roles (`@everyone`, `moderator`, `admin`, `owner`).

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Body JSON:

```json
{
  "name": "Backend Team",
  "is_public": true
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
    "owner_id": "7e034d77-91a3-4de7-a467-2ac8e954dc53",
    "is_public": true,
    "default_role_id": "1ae79d12-b2d4-4f0f-b6b6-2e09e87f4dd4",
    "icon_url": null,
    "banner_url": null
  }
}
```

---

### SERVERS: Join Public Server

- Method: `POST`
- Path: `/api/v1/servers/:id/join`
- Auth: `Bearer token`
- Description: Join public server and auto-assign default role.

---

### SERVERS: Create Join Request

- Method: `POST`
- Path: `/api/v1/servers/:id/join-requests`
- Auth: `Bearer token`
- Description: Create join request for manual approval flow.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Server UUID.
- Body JSON:

```json
{
  "note": "I'd like to join the team channels."
}
```

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "Join request created",
  "data": {
    "id": "ce0f53b9-8f96-4ac8-9f49-099fa51507ee",
    "server_id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
    "user_id": "7e034d77-91a3-4de7-a467-2ac8e954dc53",
    "status": "pending"
  }
}
```

---

### SERVERS: List Join Requests

- Method: `GET`
- Path: `/api/v1/servers/:id/join-requests`
- Auth: `Bearer token`
- Description: List join requests by status (`pending|active|rejected`).

---

### SERVERS: Review Join Request

- Method: `PATCH`
- Path: `/api/v1/servers/:id/join-requests/:requestId`
- Auth: `Bearer token`
- Description: Approve or reject join request (`APPROVE_MEMBERS` required).

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Body JSON:

```json
{
  "approve": true,
  "note": "Welcome aboard"
}
```

#### Error Responses

- Status: `400`
- Meaning: Request already reviewed.

```json
{
  "success": false,
  "code": "JOIN_REQUEST_ALREADY_REVIEWED",
  "message": "Join request already reviewed"
}
```

---

### SERVERS: Add Member

- Method: `POST`
- Path: `/api/v1/servers/:id/members`
- Auth: `Bearer token`
- Description: Add existing user to server with default role (`MANAGE_SERVER` required).

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

### SERVERS: List Members

- Method: `GET`
- Path: `/api/v1/servers/:id/members`
- Auth: `Bearer token`
- Description: Return members with assigned roles (role includes `color`, `position`, `is_everyone`, `permissions[]`).

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Server members fetched",
  "data": [
    {
      "user": {
        "id": "66a2f8be-3055-4e11-a987-0f3dbe6dd8d1",
        "username": "john",
        "is_admin": false,
        "status": "offline",
        "avatar_url": null
      },
      "roles": [
        {
          "id": "1ae79d12-b2d4-4f0f-b6b6-2e09e87f4dd4",
          "server_id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
          "name": "@everyone",
          "color": "#99AAB5",
          "position": 0,
          "is_everyone": true,
          "permissions": ["READ_MESSAGES", "SEND_MESSAGES", "VIEW_CHANNEL"]
        }
      ]
    }
  ]
}
```

---

### SERVERS: Update Member Roles

- Method: `PATCH`
- Path: `/api/v1/servers/:id/members/:userId/roles`
- Auth: `Bearer token`
- Description: Replace all roles of target member. Actor must have `MANAGE_ROLES` and higher top-role position than target and assigned roles.

#### Error Responses

- Status: `403`
- Meaning: Actor cannot assign same/higher role or permissions above actor scope.

```json
{
  "success": false,
  "code": "ROLE_ASSIGN_FORBIDDEN",
  "message": "You are not allowed to update member roles"
}
```

---

### SERVERS: Delete Server

- Method: `DELETE`
- Path: `/api/v1/servers/:id`
- Auth: `Bearer token`
- Description: Delete server (owner-only safety still enforced).

---

### SERVERS: Kick Member

- Method: `DELETE`
- Path: `/api/v1/servers/:id/members/:userId`
- Auth: `Bearer token`
- Description: Remove member from server (owner-only).

#### Frontend Notes

- Permission bitset is summed and checked with bitwise-AND.
- `ADMINISTRATOR` bypasses normal permission checks.
- Channel-level visibility/send permissions are resolved by server roles + channel overwrites.

---

### SERVERS: List My Servers

- Method: `GET`
- Path: `/api/v1/servers`
- Auth: `Bearer token`
- Description: List all active servers that current user joined/owns.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Servers fetched",
  "data": [
    {
      "id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
      "name": "Backend Team",
      "owner_id": "7e034d77-91a3-4de7-a467-2ac8e954dc53",
      "is_public": true,
      "default_role_id": "1ae79d12-b2d4-4f0f-b6b6-2e09e87f4dd4",
      "icon_url": null,
      "banner_url": null
    }
  ]
}
```

---

### SERVERS: Get Server Detail

- Method: `GET`
- Path: `/api/v1/servers/:id`
- Auth: `Bearer token`
- Description: Fetch a single server that the current user belongs to.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Server UUID.

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Server fetched",
  "data": {
    "id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
    "name": "Backend Team",
    "owner_id": "7e034d77-91a3-4de7-a467-2ac8e954dc53",
    "is_public": true,
    "default_role_id": "1ae79d12-b2d4-4f0f-b6b6-2e09e87f4dd4",
    "icon_url": null,
    "banner_url": null
  }
}
```

---

### SERVERS: Update Server Profile

- Method: `PATCH`
- Path: `/api/v1/servers/:id`
- Auth: `Bearer token`
- Description: Update server name/icon/banner. Owner only.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Server UUID.
- Body JSON (all fields optional):

```json
{
  "name": "Verify Updated",
  "icon_url": "https://example.com/icon.png",
  "banner_url": "https://example.com/banner.png"
}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Server updated",
  "data": {
    "id": "d65bdaa2-0805-4067-b101-059ea536a422",
    "name": "Verify Updated",
    "owner_id": "951cd6d3-3968-422c-800a-07c06158b09e",
    "is_public": false,
    "default_role_id": "47645438-f4f1-4fd6-a83b-09de8a4a095a",
    "icon_url": "https://example.com/icon.png",
    "banner_url": "https://example.com/banner.png"
  }
}
```

#### Error Responses

- Status: `403`
- Meaning: Caller is not server owner.

```json
{
  "success": false,
  "code": "SERVER_OWNER_REQUIRED",
  "message": "Only server owner can perform this action"
}
```

#### Error Responses

- Status: `403`
- Meaning: Current user is not a member of the target server.

```json
{
  "success": false,
  "code": "NOT_SERVER_MEMBER",
  "message": "You are not a member of this server"
}
```

---

### SERVERS: List Server Channels

- Method: `GET`
- Path: `/api/v1/servers/:id/channels`
- Auth: `Bearer token`
- Description: List channels visible to current user in server. Private channels are returned only when user is explicit channel member (or admin).

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - Server UUID.

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Channels fetched",
  "data": [
    {
      "id": "a9f4c1ba-6e28-4cb9-a51f-53fcd7f0f3bb",
      "server_id": "16b2dfea-11c5-42b1-a587-f07b37b7bc61",
      "type": "TEXT",
      "name": "general",
      "position": 0,
      "is_private": false
    }
  ]
}
```
