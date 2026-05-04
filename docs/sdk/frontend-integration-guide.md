# GoPortal Game SDK v2 - Frontend Integration Guide (EN/VI)

This document is the recommended frontend handbook for integrating GoPortal Game SDK v2 in production projects.

Tai lieu nay la handbook danh cho frontend dev khi tich hop GoPortal Game SDK v2 vao du an thuc te.

## 1) Who this guide is for / Tai lieu nay danh cho ai

- Frontend teams building HTML game bundles for upload.
- Frontend teams building React/Vite game apps.
- Teams needing share score, achievements, room state sync, and realtime events.

- Team frontend build game HTML de upload.
- Team frontend build game bang React/Vite.
- Team can share score, achievements, room sync, va realtime events.

## 2) SDK architecture / Kien truc SDK

SDK v2 is an iframe bridge SDK:

1. Game runs inside iframe.
2. SDK sends command messages (`GOPORTAL_SDK_REQUEST`) to host app shell.
3. Host executes backend calls, then sends responses (`GOPORTAL_SDK_RESPONSE`).
4. Host pushes realtime room events (`GOPORTAL_GAME_EVENT`) back to game.

SDK v2 hoat dong theo mo hinh bridge trong iframe:

1. Game chay trong iframe.
2. SDK gui command (`GOPORTAL_SDK_REQUEST`) len app shell.
3. App shell goi backend va tra response (`GOPORTAL_SDK_RESPONSE`).
4. App shell day realtime event (`GOPORTAL_GAME_EVENT`) nguoc lai game.

## 3) Integration modes / Cac cach tich hop

### A. Script mode (HTML game zip)

Use this for static HTML upload flows.

Dung cho game HTML tinh upload zip.

```html
<script src="./goportal-game-sdk.js"></script>
<script>
  async function boot() {
    const sdk = window.GoPortalGameSDK
    await sdk.ready()
    await sdk.init({ metadata: { mode: 'html_game', build: 'v2' } })
  }
  boot().catch(console.error)
</script>
```

### B. NPM mode (React/Vite and modern bundlers)

Use this for React/Vite/TypeScript projects.

Dung cho du an React/Vite/TypeScript.

```ts
import { createGoPortalSDK } from '@goportal/game-sdk'

const sdk = createGoPortalSDK()
await sdk.ready()
await sdk.init({ metadata: { mode: 'react_vite_game', build: 'v2' } })
```

## 4) Required lifecycle / Vong doi bat buoc

Always follow this sequence:

1. Create SDK client.
2. `await sdk.ready()` handshake with host.
3. `await sdk.init(...)` to create game session.
4. Use `sdk.commands.*` for gameplay actions.

Luon follow dung thu tu:

1. Tao SDK client.
2. `await sdk.ready()` handshake voi host.
3. `await sdk.init(...)` de tao session.
4. Dung `sdk.commands.*` cho game actions.

## 5) API quick reference / API tham chieu nhanh

### Handshake

- `sdk.ready()`
  - Returns `protocol_version`, `capabilities`, `context`.

- `sdk.ready()`
  - Tra ve `protocol_version`, `capabilities`, `context`.

### Session and sharing

- `sdk.commands.init(payload)`
- `sdk.commands.shareScore({ score, comment?, channel_id?, share?, idempotency_key?, payload? })`
- `sdk.commands.shareAchievement({ achievement_code?, achievement_title?, comment?, channel_id?, share?, idempotency_key?, payload? })`
- `sdk.commands.shareGame({ channel_id?, comment?, share? })`
- `sdk.commands.shareSessionStart({ channel_id?, comment?, share? })`

If `channel_id` is omitted and `share !== false`, host app opens Share Picker so player can select server/channel.

Neu khong truyen `channel_id` va `share !== false`, host app se mo Share Picker de nguoi choi chon server/channel.

### Multiplayer and room state

- `sdk.commands.createRoom({ channel_id?, room_name?, max_players? })`
- `sdk.commands.joinRoom({ room_id })`
- `sdk.commands.leaveRoom({ room_id })`
- `sdk.commands.subscribeRoom({ room_id })`
- `sdk.commands.getRoomState({ room_id })`
- `sdk.commands.sendState({ room_id, state, state_version?, idempotency_key? })`

### Realtime events

- `sdk.on('*', handler)`
- `sdk.on('GAME_ROOM_STATE_UPDATED', handler)`
- `sdk.on('gop.sdk.share_status', handler)` with statuses: `opened`, `submitted`, `shared`, `cancelled`, `failed`.

## 6) Legacy compatibility / Tuong thich nguoc

Legacy methods are still available for one migration cycle:

- `sdk.shareScore(score, payload?)`
- `sdk.joinRoom(roomId)`
- `sdk.sendState(roomId, state, version?, idempotencyKey?)`

Method cu van duoc giu trong 1 chu ky migration:

- `sdk.shareScore(score, payload?)`
- `sdk.joinRoom(roomId)`
- `sdk.sendState(roomId, state, version?, idempotencyKey?)`

For new projects, use command-style API.

Du an moi nen dung command-style API.

## 7) Full example: HTML game / Vi du day du: HTML game

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>GoPortal SDK HTML Example</title>
  </head>
  <body>
    <button id="share">Share Score</button>
    <pre id="log"></pre>

    <script src="./goportal-game-sdk.js"></script>
    <script>
      ;(async function () {
        var log = document.getElementById('log')
        function out(msg) {
          log.textContent += msg + '\n'
        }

        var sdk = window.GoPortalGameSDK
        if (!sdk) {
          out('SDK not found')
          return
        }

        try {
          var handshake = await sdk.ready()
          out('ready: ' + JSON.stringify(handshake))
          var session = await sdk.init({ metadata: { mode: 'html_sample', build: 'v2' } })
          out('session: ' + JSON.stringify(session))
        } catch (err) {
          out('init error: ' + (err && err.message ? err.message : 'unknown'))
        }

        sdk.on('*', function (event) {
          out('event: ' + JSON.stringify(event))
        })

        document.getElementById('share').addEventListener('click', function () {
          sdk.commands
            .shareScore({
              score: Math.floor(Math.random() * 1000),
              comment: 'HTML game score (host Share Picker when no channel_id)',
              idempotency_key: 'score-' + Date.now(),
            })
            .then(function (res) {
              out('share ok: ' + JSON.stringify(res))
            })
            .catch(function (err) {
              out('share error: ' + (err && err.message ? err.message : 'unknown'))
            })
        })
      })()
    </script>
  </body>
</html>
```

## 8) Full example: React/Vite / Vi du day du: React/Vite

```tsx
import React from 'react'
import { createGoPortalSDK } from '@goportal/game-sdk'

const sdk = createGoPortalSDK()

export function GameApp() {
  const [status, setStatus] = React.useState('booting')

  React.useEffect(() => {
    const off = sdk.on('*', (event) => {
      if (event.event_type === 'gop.sdk.share_status') {
        console.log('share status', event.status, event.share_action)
        return
      }
      console.log('realtime', event)
    })

    void sdk
      .ready()
      .then(() => sdk.init({ metadata: { mode: 'react_vite_sample', build: 'v2' } }))
      .then(() => setStatus('ready'))
      .catch((err) => setStatus(`error: ${err instanceof Error ? err.message : 'unknown'}`))

    return () => {
      off()
      sdk.destroy()
    }
  }, [])

  const onShare = React.useCallback(() => {
    void sdk.commands
      .shareScore({
        score: Math.floor(Math.random() * 500),
        comment: 'React/Vite score',
        idempotency_key: `share-${Date.now()}`,
      })
      .then(() => setStatus('shared'))
      .catch((err) => setStatus(`share failed: ${err instanceof Error ? err.message : 'unknown'}`))
  }, [])

  return (
    <div>
      <h1>GoPortal SDK React/Vite Example</h1>
      <p>Status: {status}</p>
      <button onClick={onShare}>Share score</button>
    </div>
  )
}
```

## 9) Realtime room sync example / Vi du realtime room sync

```ts
await sdk.ready()
await sdk.init({ metadata: { mode: 'multiplayer' } })

const room = await sdk.commands.createRoom({ room_name: 'my-room', max_players: 8 })
await sdk.commands.subscribeRoom({ room_id: room.room.id })

sdk.on('GAME_ROOM_STATE_UPDATED', (event) => {
  console.log('room update', event)
})

await sdk.commands.sendState({
  room_id: room.room.id,
  state: { players: { p1: { x: 10, y: 20 } } },
  state_version: 2,
  idempotency_key: `state-${Date.now()}`,
})
```

## 10) Error handling / Xu ly loi

SDK throws `GoPortalSDKError` with:

- `message`
- `code`
- `retryable`

SDK throw `GoPortalSDKError` voi:

- `message`
- `code`
- `retryable`

Example:

```ts
try {
  await sdk.commands.shareGame({})
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message)
  }
}
```

Common error codes:

- `ERR_CHANNEL_REQUIRED`
- `ERR_ROOM_REQUIRED`
- `ERR_NOT_READY`
- `ERR_TIMEOUT`
- `ERR_UNSUPPORTED_ACTION`

## 11) Production checklist / Checklist production

- [ ] Call `await sdk.ready()` before first command.
- [ ] Call `sdk.destroy()` on unmount/page destroy.
- [ ] Use `idempotency_key` for retry-sensitive writes.
- [ ] Handle `ERR_TIMEOUT` and retry where safe.
- [ ] Validate room/session state after reconnect.
- [ ] Keep SDK version pinned for release stability.

- [ ] Goi `await sdk.ready()` truoc command dau tien.
- [ ] Goi `sdk.destroy()` khi unmount/dong trang.
- [ ] Dung `idempotency_key` cho write co the retry.
- [ ] Xu ly `ERR_TIMEOUT` va retry khi an toan.
- [ ] Verify room/session state sau reconnect.
- [ ] Pin version SDK de release on dinh.

## 12) Where to see working samples / Noi xem sample da chay

- Script HTML sample:
  - `samples/single-player-score`
  - `samples/multiplayer-tank-room`
- NPM React/Vite sample:
  - `samples/react-vite-game`

## 13) Related docs / Tai lieu lien quan

- `game-sdk/README.md`
- `docs/sdk/migration-v1-to-v2.md`
