### TOURNAMENTS: CREATE

- Method: `POST`
- Path: `/api/v1/servers/:id/tournaments`
- Auth: `Bearer token`
- Description: Tạo tournament trong server. Mặc định status là `draft`.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Path params:
  - `id`: `string` - ID server
- Body JSON:

```json
{
  "name": "Spring Cup 2026",
  "description": "Giải đấu nội bộ",
  "game": "Valorant",
  "format": "single_elimination",
  "max_participants": 16,
  "participant_type": "solo",
  "registration_deadline": 1775097600,
  "check_in_duration_minutes": 20,
  "prize_pool": "500 USD",
  "rules": "BO1 tới bán kết, chung kết BO3"
}
```

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "Tournament created",
  "data": {
    "id": "f9e2e72c-29db-4880-8d53-82ae4d5459eb",
    "server_id": "4d5f4f0b-7825-4bbb-97cb-6e166532db3d",
    "name": "Spring Cup 2026",
    "game": "Valorant",
    "format": "single_elimination",
    "status": "draft",
    "max_participants": 16,
    "participant_type": "solo",
    "check_in_duration_minutes": 20
  }
}
```

#### Error Responses

- `403` `INSUFFICIENT_PERMISSION`
- `404` `SERVER_NOT_FOUND`
- `400` `TOURNAMENT_INVALID_FORMAT`

---

### TOURNAMENTS: LIST BY SERVER

- Method: `GET`
- Path: `/api/v1/servers/:id/tournaments`
- Auth: `Bearer token`
- Description: Lấy danh sách tournament theo server.

#### Request

- Query params:
  - `status`: `string` optional
  - `page`: `int` optional, default `1`
  - `limit`: `int` optional, default `20`, max `100`

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Tournaments fetched",
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "limit": 20
  }
}
```

---

### TOURNAMENTS: DETAIL

- Method: `GET`
- Path: `/api/v1/tournaments/:id`
- Auth: `Bearer token`
- Description: Lấy thông tin tournament + participant count + participant list.

---

### TOURNAMENTS: UPDATE

- Method: `PATCH`
- Path: `/api/v1/tournaments/:id`
- Auth: `Bearer token`
- Description: Cập nhật tournament (host/permission `MANAGE_CHANNELS`).

#### Request body fields

- `name`, `description`, `rules`, `prize_pool`, `max_participants`, `registration_deadline`

#### Error Responses

- `400` `TOURNAMENT_UPDATE_FORBIDDEN` (khi tournament đã `in_progress`/`completed`)
- `403` `TOURNAMENT_FORBIDDEN`

---

### TOURNAMENTS: DELETE

- Method: `DELETE`
- Path: `/api/v1/tournaments/:id`
- Auth: `Bearer token`
- Description: Xóa tournament, chỉ cho status `draft`.

#### Error Responses

- `400` `TOURNAMENT_DELETE_FORBIDDEN`

---

### TOURNAMENTS: STATUS TRANSITION

- Method: `PATCH`
- Path: `/api/v1/tournaments/:id/status`
- Auth: `Bearer token`
- Description: Chuyển trạng thái tournament với flow:
  - `draft -> registration -> check_in -> in_progress -> completed`
  - `cancelled` được phép từ mọi trạng thái trừ `completed`

#### Request JSON

```json
{
  "status": "in_progress"
}
```

#### Error Responses

- `400` `TOURNAMENT_INVALID_STATUS_TRANSITION`
- `400` `TOURNAMENT_BRACKET_GENERATION_FAILED`
