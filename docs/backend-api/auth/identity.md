### AUTH: Register

- Method: `POST`
- Path: `/api/v1/auth/register`
- Auth: `public`
- Description: Create a new user account. Password is hashed with bcrypt before persistence.

#### Request

- Headers:
  - `Content-Type: application/json`
- Path params:
  - None
- Query params:
  - None
- Body JSON:

```json
{
  "username": "john",
  "password": "password123"
}
```

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "User created",
  "data": {
    "id": "8d3f6506-6569-4b31-a74a-d9d43c359ee5",
    "username": "john",
    "is_admin": false,
    "status": "offline",
    "avatar_url": null
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: Invalid JSON payload or missing required fields.

```json
{
  "success": false,
  "code": "INVALID_JSON",
  "message": "Invalid JSON payload"
}
```

- Status: `409`
- Meaning: Username already exists.

```json
{
  "success": false,
  "code": "USERNAME_EXISTS",
  "message": "Username already exists"
}
```

#### Frontend Notes

- `username` minimum length is 3, `password` minimum length is 6.
- Use a UUID string for user `id`.
- Keep username trim-safe on client side to reduce avoidable validation errors.

---

### AUTH: Login

- Method: `POST`
- Path: `/api/v1/auth/login`
- Auth: `public`
- Description: Authenticate a user and return JWT token with user payload.

#### Request

- Headers:
  - `Content-Type: application/json`
- Path params:
  - None
- Query params:
  - None
- Body JSON:

```json
{
  "username": "john",
  "password": "password123"
}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "8d3f6506-6569-4b31-a74a-d9d43c359ee5",
      "username": "john",
      "is_admin": false,
      "status": "offline",
      "avatar_url": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI..."
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

- Status: `401`
- Meaning: Invalid credentials.

```json
{
  "success": false,
  "code": "BAD_CREDENTIALS",
  "message": "Invalid username or password"
}
```

#### Frontend Notes

- Store token as Bearer token for protected endpoints.
- Token includes user identity claims and expires after 24 hours.
