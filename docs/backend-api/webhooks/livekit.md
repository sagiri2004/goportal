### WEBHOOKS: LiveKit Events

- Method: `POST`
- Path: `/api/v1/webhooks/livekit`
- Auth: `public` (signed by LiveKit)
- Description: Receives LiveKit webhook events and verifies request signature with configured API key/secret. Handles `egress_ended` to update recording rows automatically.

#### Request

- Headers:
  - `Content-Type: application/webhook+json` (or JSON)
  - `Authorization: Bearer <livekit-signature-token>`
- Body JSON:

```json
{
  "id": "EV_8f2uQ",
  "event": "egress_ended",
  "created_at": 1774096160,
  "egress_info": {
    "egress_id": "EG_qk49E0x9R7x2",
    "room_name": "f2b96856-38fc-4573-a74b-57ddf7d247fd",
    "status": "EGRESS_COMPLETE",
    "started_at": 1774096001,
    "ended_at": 1774096088,
    "file_results": [
      {
        "location": "file:///out/f2b96856-38fc-4573-a74b-57ddf7d247fd/1774096001-room.mp4"
      }
    ]
  }
}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Webhook processed"
}
```

#### Error Responses

- Status: `401`
- Meaning: Signature verification failed

```json
{
  "success": false,
  "code": "LIVEKIT_WEBHOOK_INVALID",
  "message": "Invalid LiveKit webhook signature"
}
```

#### Frontend Notes

- This endpoint is backend-to-backend only and should not be called by frontend clients.
