### UPLOADS: Upload Media

- Method: `POST`
- Path: `/api/v1/upload`
- Auth: `Bearer token`
- Description: Generic media upload endpoint used by avatars, server images, role icons, and message attachments.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
  - `Content-Type: multipart/form-data`
- Path params:
  - None
- Query params:
  - None
- Body form-data:
  - `file`: binary file
  - `media_type`: `avatar | server_icon | server_banner | role_icon | message_attachment` (optional, default `message_attachment`)

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "File uploaded",
  "data": {
    "attachment_id": "9dd2151d-a31f-4f33-b9f3-7a46a8092222",
    "media_type": "message_attachment",
    "url": "https://res.cloudinary.com/<cloud>/image/upload/v1742165419/goportal/messages/06f3395f.png",
    "file_name": "image.png",
    "file_type": "image/png",
    "file_size": 120482
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: File missing, unsupported media type, too large, or unsupported MIME type.

```json
{
  "success": false,
  "code": "INVALID_MEDIA_TYPE",
  "message": "Invalid media type"
}
```

#### Frontend Notes

- `message_attachment`: allows `image/*`, `video/*`, `audio/*`, `application/pdf`, `application/zip` (max 25MB).
- `avatar`, `server_icon`, `server_banner`, `role_icon`: image-only (max 5MB).
- Only `message_attachment` returns `attachment_id`; pass that ID into `POST /api/v1/messages`.
