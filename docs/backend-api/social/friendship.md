### SOCIAL: List Friends

- Method: `GET`
- Path: `/api/v1/friends`
- Auth: `Bearer token`
- Description: Return all accepted friends for the current user.

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
  "message": "Friends fetched",
  "data": [
    {
      "id": "74adf0f7-5b95-4e90-ae5b-498f6fb8d8dc",
      "username": "alice",
      "is_admin": false
    }
  ]
}
```

#### Error Responses

- Status: `401`
- Meaning: Missing or invalid token.

```json
{
  "error": "Authorization header or token query required"
}
```

#### Frontend Notes

- This endpoint is currently non-paginated in Phase 1.
- `data` may be an empty list when user has no accepted friends.

---

### SOCIAL: Send Friend Request

- Method: `POST`
- Path: `/api/v1/friends/request`
- Auth: `Bearer token`
- Description: Send a friend request to another user.

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
  "user_id": "74adf0f7-5b95-4e90-ae5b-498f6fb8d8dc"
}
```

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "Friend request sent",
  "data": {
    "id": "dd24daf6-2b65-4bb2-aa5f-c3e6f8920ee6",
    "requester_id": "8d3f6506-6569-4b31-a74a-d9d43c359ee5",
    "addressee_id": "74adf0f7-5b95-4e90-ae5b-498f6fb8d8dc",
    "status": "PENDING"
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: Invalid JSON or self-friend request.

```json
{
  "success": false,
  "code": "CANNOT_FRIEND_SELF",
  "message": "You cannot send a friend request to yourself"
}
```

- Status: `403`
- Meaning: Existing blocked relationship prevents friend request.

```json
{
  "success": false,
  "code": "RELATIONSHIP_BLOCKED",
  "message": "Relationship is blocked"
}
```

- Status: `409`
- Meaning: Already friends or request already exists.

```json
{
  "success": false,
  "code": "FRIEND_REQUEST_EXISTS",
  "message": "Friend request already exists"
}
```

#### Frontend Notes

- `user_id` must be a UUID string.
- Status on creation is always `PENDING`.

---

### SOCIAL: Respond Friend Request

- Method: `PATCH`
- Path: `/api/v1/friends/response`
- Auth: `Bearer token`
- Description: Accept or decline an incoming friend request.

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
  "requester_id": "8d3f6506-6569-4b31-a74a-d9d43c359ee5",
  "action": "ACCEPT"
}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Friend request updated",
  "data": {
    "id": "dd24daf6-2b65-4bb2-aa5f-c3e6f8920ee6",
    "requester_id": "8d3f6506-6569-4b31-a74a-d9d43c359ee5",
    "addressee_id": "74adf0f7-5b95-4e90-ae5b-498f6fb8d8dc",
    "status": "ACCEPTED"
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: Invalid action value.

```json
{
  "success": false,
  "code": "INVALID_ACTION",
  "message": "Invalid action"
}
```

- Status: `404`
- Meaning: Pending request not found.

```json
{
  "success": false,
  "code": "FRIEND_REQUEST_NOT_FOUND",
  "message": "Friend request not found"
}
```

#### Frontend Notes

- `action` supports only `ACCEPT` or `DECLINE`.
- On `DECLINE`, friendship is not created and status becomes `DECLINED`.
