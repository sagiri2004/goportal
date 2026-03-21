# Backend API + Socket Error Log

## Failure 1: Missing websocket notification after message creation

- HTTP Endpoint: `POST /api/v1/messages`
- Expected HTTP: `201`
- Actual HTTP: `201`
- Expected Socket: `POPUP event for U1`
- Actual Socket: `No POPUP event, only CONNECTED`

### Curl Request
```bash
[POST] http://localhost:8080/api/v1/messages
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmFjNTc0YTAtMTJiZC00OTQ0LTk2NmUtM2U1YmEzN2IxZjYwIiwidXNlcm5hbWUiOiJzb2NrYV8yMDI2MDMxNy0yMDI4MjciLCJyb2xlIjoidXNlciIsImV4cCI6MTc3Mzg0MDUwNywiaWF0IjoxNzczNzU0MTA3fQ.mgC15jubzy9p72ghDM2X6DXd1_nCh74PCTNTLMgja6M
{"channel_id":"4a3a1e66-4b4f-459b-b5b3-88795719c7f8","content_type":"text/plain","content":"hello from u1 20260317-202827","encoding":"utf-8"}
```

### HTTP Response
```text
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Date: Tue, 17 Mar 2026 13:28:30 GMT
Content-Length: 389

{"success":true,"code":"OK","message":"Message created","data":{"id":"80030b35-d571-42e2-8fad-25a03bd0fb8b","channel_id":"4a3a1e66-4b4f-459b-b5b3-88795719c7f8","author_id":"bac574a0-12bd-4944-966e-3e5ba37b1f60","content":{"type":"text/plain","payload":"hello from u1 20260317-202827","encoding":"utf-8"},"is_edited":false,"is_pinned":false,"created_at":1773754110,"updated_at":1773754110}}
```

### WebSocket Transcript
```text
2026-03-17T13:28:28.241Z WS_START
2026-03-17T13:28:28.304Z U1 OPEN ws://localhost:8085/ws?user_id=bac574a0-12bd-4944-966e-3e5ba37b1f60&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmFjNTc0YTAtMTJiZC00OTQ0LTk2NmUtM2U1YmEzN2IxZjYwIiwidXNlcm5hbWUiOiJzb2NrYV8yMDI2MDMxNy0yMDI4MjciLCJyb2xlIjoidXNlciIsImV4cCI6MTc3Mzg0MDUwNywiaWF0IjoxNzczNzU0MTA3fQ.mgC15jubzy9p72ghDM2X6DXd1_nCh74PCTNTLMgja6M
2026-03-17T13:28:28.307Z U2 OPEN ws://localhost:8085/ws?user_id=670149e1-824b-416b-bb22-f18742212eaa&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjcwMTQ5ZTEtODI0Yi00MTZiLWJiMjItZjE4NzQyMjEyZWFhIiwidXNlcm5hbWUiOiJzb2NrYl8yMDI2MDMxNy0yMDI4MjciLCJyb2xlIjoidXNlciIsImV4cCI6MTc3Mzg0MDUwOCwiaWF0IjoxNzczNzU0MTA4fQ.iPSqE95wZUuPbSY0qx4xuZMOXoHZEa96VTSN589Hd6E
2026-03-17T13:28:28.308Z U1 MSG {"type":"CONNECTED","user_id":"bac574a0-12bd-4944-966e-3e5ba37b1f60","payload":{"status":"ok"},"priority":"NORMAL","timestamp":"2026-03-17T13:28:28Z"}

2026-03-17T13:28:28.308Z U2 MSG {"type":"CONNECTED","user_id":"670149e1-824b-416b-bb22-f18742212eaa","payload":{"status":"ok"},"priority":"NORMAL","timestamp":"2026-03-17T13:28:28Z"}

2026-03-17T13:28:53.304Z WS_END

```

### Suspected Root Cause
- Notification server expects inbound field `user_id`, but backend emits `target_user_id` structure; handler logs `inbound notification missing user_id`.

### Suggested Debug Entry Point
- `notification/internal/domain/notification.go`
- `notification/internal/usecase/dispatch_notification.go`
- `backend/pkg/services/impl/notification_service_impl.go`
