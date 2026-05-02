### Games: Create Game

- Method: `POST`
- Path: `/api/v1/games`
- Auth: `Bearer token`
- Description: Create a game metadata record that can receive uploaded builds.

#### Request

- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Body JSON:

```json
{
  "title": "Chess Arena",
  "slug": "chess-arena",
  "description": "Realtime chess game built with Vite",
  "visibility": "public",
  "thumbnail_url": "https://cdn.example.com/chess-thumb.png",
  "category": "board",
  "tags": ["chess", "multiplayer"],
  "age_rating": "everyone"
}
```

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "Game created",
  "data": {
    "id": "f8c7b44e-1d9b-4f8d-84cc-6d0a12f5a7a2",
    "owner_user_id": "2c84f127-0b02-49fd-9be7-b90dfeb2cc0f",
    "title": "Chess Arena",
    "slug": "chess-arena",
    "visibility": "public",
    "status": "published",
    "source_type": "community",
    "publish_state": "draft",
    "created_at": 1713420000,
    "updated_at": 1713420000
  }
}
```

#### Error Responses

- Status: `400` — Missing required fields or invalid JSON.
- Status: `401` — Missing/invalid auth token.

```json
{
  "success": false,
  "code": "MISSING_FIELDS",
  "message": "Missing required fields"
}
```

#### Frontend Notes

- `slug` is normalized to lower-case kebab-case on backend.
- `visibility` supports `public` and `private`.
- New community games start as `publish_state=draft` and should call `POST /api/v1/games/:id/submit-review` after build upload.

---

### Games: Upload Build Bundle

- Method: `POST`
- Path: `/api/v1/games/:id/builds`
- Auth: `Bearer token`
- Description: Upload a `.zip` bundle for a game and publish a playable build if validation passes.

#### Request

- Headers:
  - `Authorization: Bearer {{token}}`
  - `Content-Type: multipart/form-data`
- Path params:
  - `id`: `string` - game id.
- Form fields:
  - `version`: `string` (optional) - build version label.
  - `file`: `file` (required) - zip bundle containing `index.html`.

#### Success Response

- Status: `201`

```json
{
  "success": true,
  "code": "OK",
  "message": "Game build uploaded",
  "data": {
    "id": "87e35e8a-4894-4167-9ecb-9f4abc5f4ff3",
    "game_id": "f8c7b44e-1d9b-4f8d-84cc-6d0a12f5a7a2",
    "version": "v1.0.0",
    "storage_zip_url": "/uploads/game-bundles/171341....zip",
    "play_base_path": "/game-content/f8c7b44e-1d9b-4f8d-84cc-6d0a12f5a7a2/87e35e8a-4894-4167-9ecb-9f4abc5f4ff3",
    "entry_file": "index.html",
    "status": "ready"
  }
}
```

#### Error Responses

- Status: `400` — invalid zip, missing `index.html`, unsafe paths, unsupported file types.
- Status: `403` — current user is not game owner.
- Status: `404` — game not found.

```json
{
  "success": false,
  "code": "GAME_BUNDLE_MISSING_INDEX",
  "message": "Game bundle must include index.html at root"
}
```

#### Frontend Notes

- Build should be `vite build` output zipped with `index.html` at root.
- For Vite apps use `base: './'` to avoid broken asset paths.

---

### Games: List Public Games

- Method: `GET`
- Path: `/api/v1/games`
- Auth: `public`
- Description: Return published public games with latest ready build.

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
        "id": "f8c7b44e-1d9b-4f8d-84cc-6d0a12f5a7a2",
        "title": "Chess Arena",
        "slug": "chess-arena",
        "visibility": "public",
        "status": "published"
      },
      "build": {
        "id": "87e35e8a-4894-4167-9ecb-9f4abc5f4ff3",
        "version": "v1.0.0",
        "play_base_path": "/game-content/f8c7b44e-1d9b-4f8d-84cc-6d0a12f5a7a2/87e35e8a-4894-4167-9ecb-9f4abc5f4ff3",
        "entry_file": "index.html",
        "status": "ready"
      }
    }
  ]
}
```

---

### Games: Get Game Detail

- Method: `GET`
- Path: `/api/v1/games/:id`
- Auth: `public` (private games only for owner)
- Description: Fetch game metadata and latest ready build if available.

#### Error Responses

- Status: `403` — private game and caller is not owner.
- Status: `404` — game not found.

---

### Games: Create Play Session

- Method: `GET`
- Path: `/api/v1/games/:id/play-session`
- Auth: `Bearer token`
- Description: Return playable iframe URL for latest ready build.

#### Success Response

- Status: `200`

```json
{
  "success": true,
  "code": "OK",
  "message": "Play session created",
  "data": {
    "play_url": "/game-content/f8c7b44e-1d9b-4f8d-84cc-6d0a12f5a7a2/87e35e8a-4894-4167-9ecb-9f4abc5f4ff3/index.html",
    "title": "Chess Arena",
    "version": "v1.0.0",
    "game_id": "f8c7b44e-1d9b-4f8d-84cc-6d0a12f5a7a2",
    "entry_file": "index.html"
  }
}
```

#### Error Responses

- Status: `404` — game/build not found.
- Status: `400` — game disabled/unavailable.

#### Frontend Notes

- Render `data.play_url` directly into `<iframe src="...">`.
- This MVP uses static URL; signed short-lived URLs can be added later.
