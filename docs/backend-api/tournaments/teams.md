### TOURNAMENTS: CREATE TEAM

- Method: `POST`
- Path: `/api/v1/tournaments/:id/teams`
- Auth: `Bearer token`
- Description: T?o team (ch? khi tournament `participant_type = team`). Ngu?i t?o là captain và du?c add vào team members.

#### Request JSON

```json
{
  "name": "Alpha"
}
```

---

### TOURNAMENTS: LIST TEAMS

- Method: `GET`
- Path: `/api/v1/tournaments/:id/teams`
- Auth: `Bearer token`
- Description: L?y danh sách teams kèm members.

---

### TOURNAMENTS: ADD TEAM MEMBER

- Method: `POST`
- Path: `/api/v1/tournaments/:id/teams/:teamId/members`
- Auth: `Bearer token`
- Description: Add member vào team (captain ho?c tournament creator).

#### Request JSON

```json
{
  "user_id": "f87d5a21-4ccf-4f48-b6cd-a5a0474ad8e8"
}
```

---

### TOURNAMENTS: REMOVE TEAM MEMBER

- Method: `DELETE`
- Path: `/api/v1/tournaments/:id/teams/:teamId/members/:userId`
- Auth: `Bearer token`

---

### TOURNAMENTS: DELETE TEAM

- Method: `DELETE`
- Path: `/api/v1/tournaments/:id/teams/:teamId`
- Auth: `Bearer token`
- Description: Xóa team (captain ho?c creator).
