## E2E Multiplayer (Playwright)

Run from `frontend/`:

1. `npm install`
2. `npx playwright install chromium`
3. Start backend + frontend web dev server.
4. Run `npm run e2e`

Optional env:

- `E2E_BASE_URL` default `http://localhost:5173`
- `E2E_CHESS_URL` full game iframe URL
- `E2E_ROOM_ID` fixed room id for debugging

