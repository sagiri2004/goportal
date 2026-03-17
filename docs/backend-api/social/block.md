### SOCIAL: Block User

- Method: `PATCH`
- Path: `/api/v1/friends/block`
- Auth: `Bearer token`
- Description: Block a target user. Existing relationship is converted to `BLOCKED` by current user.

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

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "User blocked",
  "data": {
    "id": "f4074c88-0071-4433-be66-5f820a8bd1c5",
    "requester_id": "8d3f6506-6569-4b31-a74a-d9d43c359ee5",
    "addressee_id": "74adf0f7-5b95-4e90-ae5b-498f6fb8d8dc",
    "status": "BLOCKED"
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: Attempt to block self.

```json
{
  "success": false,
  "code": "CANNOT_BLOCK_SELF",
  "message": "You cannot block yourself"
}
```

- Status: `404`
- Meaning: Target user does not exist.

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found"
}
```

- Status: `409`
- Meaning: Target user already blocked by current user.

```json
{
  "success": false,
  "code": "USER_ALREADY_BLOCKED",
  "message": "User is already blocked"
}
```

#### Frontend Notes

- `user_id` must be a UUID string.
- After block, friend requests between the pair should be treated as restricted.
