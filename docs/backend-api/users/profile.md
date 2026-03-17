### USERS: Get Current Profile

- Method: `GET`
- Path: `/api/v1/users/me`
- Auth: `Bearer token`
- Description: Return the current authenticated user profile.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - None
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
  "message": "Current user",
  "data": {
    "id": "8d3f6506-6569-4b31-a74a-d9d43c359ee5",
    "username": "john",
    "is_admin": false
  }
}
```

#### Error Responses

- Status: `401`
- Meaning: Missing or invalid token.

```json
{
  "error": "Invalid or expired token"
}
```

#### Frontend Notes

- `id` is a UUID string.
- This endpoint does not return sensitive fields such as password.

---

### USERS: Update Current Profile

- Method: `PATCH`
- Path: `/api/v1/users/me`
- Auth: `Bearer token`
- Description: Update the current user's profile fields. In Phase 1, only `username` is updatable.

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
  "username": "john-updated"
}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Profile updated",
  "data": {
    "id": "8d3f6506-6569-4b31-a74a-d9d43c359ee5",
    "username": "john-updated",
    "is_admin": false
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: Invalid JSON payload.

```json
{
  "success": false,
  "code": "INVALID_JSON",
  "message": "Invalid JSON payload"
}
```

- Status: `409`
- Meaning: Username already in use.

```json
{
  "success": false,
  "code": "USERNAME_EXISTS",
  "message": "Username already exists"
}
```

#### Frontend Notes

- `username` minimum length is 3.
- Show conflict-specific UI message when code is `USERNAME_EXISTS`.
