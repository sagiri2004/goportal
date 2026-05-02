### Games: Market List

- Method: `GET`
- Path: `/api/v1/games/market`
- Auth: `public`
- Description: List published games with source split and discovery sorting.

#### Request

- Query params:
  - `source_type`: `system|community` (optional)
  - `q`: `string` (optional)
  - `category`: `string` (optional)
  - `sort`: `trending|top_rated|newest|most_played|featured` (optional)
  - `limit`: `number` (optional, default `20`)
  - `offset`: `number` (optional, default `0`)

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Games fetched",
  "data": [
    {
      "game": {
        "id": "c6c7c53f-5204-4e1e-9184-60d2394c620d",
        "source_type": "system",
        "title": "GoPortal Chess",
        "publish_state": "published",
        "avg_rating": 4.8,
        "rating_count": 231
      },
      "build": {
        "id": "2fdf2ba8-0b15-45e1-a31e-f3f86bcb73f4",
        "version": "v2.1.0",
        "entry_file": "index.html"
      }
    }
  ]
}
```

---

### Games: Trending

- Method: `GET`
- Path: `/api/v1/games/trending`
- Auth: `public`
- Description: Return top trending games with time-decay style ranking signal.

---

### Games: Search

- Method: `GET`
- Path: `/api/v1/games/search`
- Auth: `public`
- Description: Search by title/slug/description with source split.

---

### Games: Creator Studio APIs

- `GET /api/v1/games/me` (Bearer)
- `POST /api/v1/games/:id/submit-review` (Bearer)

Use these endpoints to manage creator inventory and submit game to moderation queue.

---

### Games: Ratings / Reviews / Reports

- `POST /api/v1/games/:id/ratings` (Bearer)
- `POST /api/v1/games/:id/reviews` (Bearer)
- `GET /api/v1/games/:id/reviews` (public)
- `POST /api/v1/games/:id/reports` (Bearer)

#### Review Request Example

```json
{
  "title": "Great replayability",
  "content": "Clean controls and nice balancing.",
  "score": 5
}
```

#### Error Response Example

```json
{
  "success": false,
  "code": "RATE_LIMITED",
  "message": "Too many requests, please retry later"
}
```

---

### Games: Admin Moderation / Curation

- `POST /api/v1/admin/games/system`
- `PATCH /api/v1/admin/games/:id/publish-state`
- `POST /api/v1/admin/games/:id/feature`
- `GET /api/v1/admin/games/review-queue`
- `PATCH /api/v1/admin/reviews/:reviewId/moderate`

All admin endpoints require `Bearer token` with role `admin`.
