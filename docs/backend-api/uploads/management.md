### UPLOADS: Upload Attachment

- Method: `POST`
- Path: `/api/v1/upload`
- Auth: `Bearer token`
- Description: Upload a file and create a reusable message attachment record.

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

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "File uploaded",
  "data": {
    "attachment_id": "9dd2151d-a31f-4f33-b9f3-7a46a8092222",
    "url": "/uploads/1742165419200-06f3395f.png",
    "file_name": "image.png",
    "file_type": "image/png",
    "file_size": 120482
  }
}
```

#### Error Responses

- Status: `400`
- Meaning: File missing, too large (>10MB), or unsupported file type.

```json
{
  "success": false,
  "code": "FILE_TYPE_NOT_ALLOWED",
  "message": "File type is not allowed"
}
```

#### Frontend Notes

- Allowed types: image/*, pdf, zip.
- Use returned `attachment_id` in `POST /api/v1/messages`.
