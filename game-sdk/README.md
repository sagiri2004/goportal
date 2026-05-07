# GoPortal Game SDK (v2)

SDK nay dung cho game chay trong `iframe` tren GoPortal. Kien truc v2 theo huong command + handshake, ho tro:

- Browser script (`window.GoPortalGameSDK`) cho HTML game zip
- NPM/ESM (`@goportal/game-sdk`) cho React/Vite va bundler hien dai

## 1) Cai dat

### A. Browser script (HTML game)

Copy file:

- `game-sdk/browser/goportal-game-sdk.js`

Nhung vao game:

```html
<script src="./goportal-game-sdk.js"></script>
```

### B. NPM package (React/Vite)

```bash
npm install @goportal/game-sdk
```

```ts
import { createGoPortalSDK } from '@goportal/game-sdk'

const sdk = createGoPortalSDK()
await sdk.ready()
```

## 2) Lifecycle v2

1. `await sdk.ready()` de handshake host, lay `protocol_version`, `capabilities`, `context`.
2. `await sdk.init(...)` de tao session.
3. Goi `sdk.commands.*` hoac API legacy methods tuy nhu cau.

## 3) API chinh

### Command-style (khuyen dung)

- `sdk.commands.init(payload)`
- `sdk.commands.shareScore(payload)`
- `sdk.commands.shareAchievement(payload)`
- `sdk.commands.shareGame(payload)`
- `sdk.commands.shareSessionStart(payload)`
- `sdk.commands.createRoom(payload)`
- `sdk.commands.joinRoom({ room_id })`
- `sdk.commands.leaveRoom({ room_id })`
- `sdk.commands.subscribeRoom({ room_id })`
- `sdk.commands.getRoomState({ room_id })`
- `sdk.commands.sendState({ room_id, state, state_version, idempotency_key })`

### Legacy-style (tuong thich nguoc)

- `sdk.init(payload)`
- `sdk.shareScore(score, payload?)`
- `sdk.shareAchievement(payload?)`
- `sdk.shareGame(payload?)`
- `sdk.createRoom(payload?)`
- `sdk.joinRoom(roomId)`
- `sdk.leaveRoom(roomId)`
- `sdk.subscribeRoom(roomId)`
- `sdk.getRoomState(roomId)`
- `sdk.sendState(roomId, state, stateVersion?, idempotencyKey?)`

## 4) Event realtime

```ts
sdk.on('*', (event) => {
  console.log(event.event_type, event)
})
```

Share workflow status can be observed via `event.event_type === 'gop.sdk.share_status'` with statuses:
`opened`, `submitted`, `shared`, `cancelled`, `failed`.

SDK nhan event qua `postMessage` tu host app shell (`GOPORTAL_GAME_EVENT`).

## 5) Error model

Loi command tra ve `GoPortalSDKError` co:

- `message`
- `code`: `ERR_BAD_REQUEST | ERR_TIMEOUT | ERR_UNAUTHORIZED | ERR_CHANNEL_REQUIRED | ERR_ROOM_REQUIRED | ERR_NOT_READY | ERR_UNSUPPORTED_ACTION | ERR_INTERNAL`
- `retryable`

## 6) Build artifacts

- ESM: `dist/esm/index.js`
- Types: `dist/index.d.ts`
- Browser global: `dist/browser/goportal-game-sdk.global.js`
- Backward-compatible copy: `browser/goportal-game-sdk.js`

## 7) Luu y

- SDK v2 tiep tuc dung `postMessage` giua iframe game va app shell.
- Neu game chay doc lap ngoai GoPortal, request se timeout do khong co host bridge.
- Khuyen nghi pin version SDK va theo migration guide khi nang cap major.

## 8) Frontend handbook

- Frontend integration guide (EN/VI): `docs/sdk/frontend-integration-guide.md`
- Migration guide: `docs/sdk/migration-v1-to-v2.md`
