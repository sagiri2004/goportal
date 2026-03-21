### CHANNELS: Generate Voice Access Token

- Method: `POST`
- Path: `/api/v1/channels/:id/voice/token`
- Auth: `Bearer token`
- Description: Generate a LiveKit JWT for the current user to join a voice channel.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - voice channel ID

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Voice token generated",
  "data": {
    "token": "<livekit-jwt>",
    "url": "ws://localhost:7880"
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: Channel is not a voice channel

```json
{
  "success": false,
  "code": "VOICE_CHANNEL_REQUIRED",
  "message": "Channel must be a voice channel"
}
```

- Status: `403`
- Meaning: User cannot access this channel

```json
{
  "success": false,
  "code": "INSUFFICIENT_PERMISSION",
  "message": "Insufficient server permissions"
}
```

#### Frontend Notes

- Token is short-lived and should be requested right before connecting to LiveKit.

---

### CHANNELS: Start Room Recording

- Method: `POST`
- Path: `/api/v1/channels/:id/recording/start`
- Auth: `Bearer token`
- Description: Start room-composite recording for a voice channel. Requires `MANAGE_CHANNELS`.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - voice channel ID

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Recording started",
  "data": {
    "id": "ee9ea915-3420-4f4e-bdeb-02f0d881e2ca",
    "channel_id": "f2b96856-38fc-4573-a74b-57ddf7d247fd",
    "server_id": "8acbd049-c704-4f0b-bde3-c76eb6d0f8e0",
    "started_by": "2dc32f93-ff98-4e03-a7fc-daf3ce23bd4d",
    "egress_id": "EG_qk49E0x9R7x2",
    "type": "room_composite",
    "status": "active",
    "started_at": 1774096001,
    "created_at": 1774096001
  }
}
```

#### Error Responses

- Status: `409`
- Meaning: Existing active recording or stream of same type

```json
{
  "success": false,
  "code": "RECORDING_ALREADY_ACTIVE",
  "message": "Recording or stream is already active"
}
```

---

### CHANNELS: Stop Room Recording

- Method: `POST`
- Path: `/api/v1/channels/:id/recording/stop`
- Auth: `Bearer token`
- Description: Stop current active room recording and persist final file URL/duration.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - voice channel ID

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Recording stopped",
  "data": {
    "id": "ee9ea915-3420-4f4e-bdeb-02f0d881e2ca",
    "channel_id": "f2b96856-38fc-4573-a74b-57ddf7d247fd",
    "egress_id": "EG_qk49E0x9R7x2",
    "type": "room_composite",
    "status": "completed",
    "file_url": "file:///out/f2b96856-38fc-4573-a74b-57ddf7d247fd/1774096001-room.mp4",
    "duration_seconds": 87,
    "started_at": 1774096001,
    "ended_at": 1774096088,
    "created_at": 1774096001
  }
}
```

#### Error Responses

- Status: `404`
- Meaning: No active recording found

```json
{
  "success": false,
  "code": "RECORDING_NOT_FOUND",
  "message": "Recording not found"
}
```

---

### CHANNELS: List Recordings

- Method: `GET`
- Path: `/api/v1/channels/:id/recordings?limit=20&offset=0`
- Auth: `Bearer token`
- Description: List channel recording history (room and RTMP rows), newest first.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - voice channel ID
- Query params:
  - `limit`: `number` - default `20`, max `100`
  - `offset`: `number` - default `0`

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Recordings fetched",
  "data": {
    "items": [
      {
        "id": "ee9ea915-3420-4f4e-bdeb-02f0d881e2ca",
        "channel_id": "f2b96856-38fc-4573-a74b-57ddf7d247fd",
        "server_id": "8acbd049-c704-4f0b-bde3-c76eb6d0f8e0",
        "started_by": "2dc32f93-ff98-4e03-a7fc-daf3ce23bd4d",
        "egress_id": "EG_qk49E0x9R7x2",
        "type": "room_composite",
        "status": "completed",
        "file_url": "file:///out/f2b96856-38fc-4573-a74b-57ddf7d247fd/1774096001-room.mp4",
        "duration_seconds": 87,
        "started_at": 1774096001,
        "ended_at": 1774096088,
        "created_at": 1774096001
      }
    ],
    "limit": 20,
    "offset": 0
  }
}
```

---

### CHANNELS: Start RTMP Stream

- Method: `POST`
- Path: `/api/v1/channels/:id/stream/start`
- Auth: `Bearer token`
- Description: Start RTMP streaming output from a voice channel. Requires `MANAGE_CHANNELS`.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
  - `Content-Type: application/json`
- Path params:
  - `id`: `string` - voice channel ID
- Body JSON:

```json
{
  "rtmp_url": "rtmp://a.rtmp.youtube.com/live2/<stream-key>"
}
```

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "RTMP stream started",
  "data": {
    "id": "8d6bd15a-a2ff-43cc-a430-5fce7b2afaa7",
    "channel_id": "f2b96856-38fc-4573-a74b-57ddf7d247fd",
    "egress_id": "EG_j1Ja8TLQq7Ac",
    "type": "rtmp",
    "status": "active",
    "rtmp_url": "rtmp://a.rtmp.youtube.com/live2/<stream-key>",
    "started_at": 1774096100,
    "created_at": 1774096100
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: `rtmp_url` is invalid

```json
{
  "success": false,
  "code": "INVALID_RTMP_URL",
  "message": "Invalid RTMP URL"
}
```

---

### CHANNELS: Stop RTMP Stream

- Method: `POST`
- Path: `/api/v1/channels/:id/stream/stop`
- Auth: `Bearer token`
- Description: Stop the currently active RTMP stream for the channel.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - voice channel ID

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "RTMP stream stopped",
  "data": {
    "id": "8d6bd15a-a2ff-43cc-a430-5fce7b2afaa7",
    "channel_id": "f2b96856-38fc-4573-a74b-57ddf7d247fd",
    "egress_id": "EG_j1Ja8TLQq7Ac",
    "type": "rtmp",
    "status": "completed",
    "rtmp_url": "rtmp://a.rtmp.youtube.com/live2/<stream-key>",
    "started_at": 1774096100,
    "ended_at": 1774096160,
    "duration_seconds": 60,
    "created_at": 1774096100
  }
}
```

#### Frontend Notes

- `type` can be `room_composite`, `track`, or `rtmp`.
- `status` values: `active`, `completed`, `failed`.
