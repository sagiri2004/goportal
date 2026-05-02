# GoPortal Game SDK

SDK nay dung cho game HTML chay trong `iframe` tren GoPortal, giup game goi len app shell de:

- Tao session cho luot choi
- Share diem (`score`) len chat
- Share thanh tuu (`achievement`) len chat
- Tao/tham gia/roi room multiplayer nhe (toi da 8 nguoi)
- Dong bo state room co ban

## 1) Cai dat nhanh

Ban co the copy file:

- `game-sdk/browser/goportal-game-sdk.js`

Sau do nhung vao game HTML:

```html
<script src="./goportal-game-sdk.js"></script>
```

SDK se expose global object: `window.GoPortalGameSDK`.

## 2) Cac ham chinh

- `init(payload)`
  - Tao session ban dau.
  - `payload` co the gom: `channel_id`, `room_id`, `metadata`.

- `shareScore(score, payload?)`
  - Gui diem va co the share len chat.
  - `payload` thuong dung: `channel_id`, `comment`.

- `shareAchievement(payload)`
  - Gui thanh tuu.
  - `payload`: `achievement_code`, `achievement_title`, `channel_id`, `comment`.

- `shareGame(payload)`
  - Share game card thong thuong len chat.
  - `payload`: `channel_id`, `comment`.

- `createRoom(payload?)`
  - Tao room moi.
  - `payload`: `channel_id`, `room_name`, `max_players`.

- `joinRoom(roomId)`
  - Tham gia room.

- `leaveRoom(roomId)`
  - Roi room.

- `subscribeRoom(roomId)`
  - Dang ky nhan realtime event cho room.

- `getRoomState(roomId)`
  - Lay state hien tai cua room.

- `sendState(roomId, state, stateVersion?)`
  - Day snapshot state moi len backend.

- `on(eventType, handler)`
  - Lang nghe event realtime tu host app.
  - Co the dung `eventType = '*'` de nghe tat ca.

## 3) Vi du su dung

```html
<script>
  async function bootGame() {
    await window.GoPortalGameSDK.init({
      channel_id: 'your-channel-id',
      metadata: { source: 'demo-html-game' }
    })

    // Khi nguoi choi dat diem moi
    await window.GoPortalGameSDK.shareScore(1200, {
      comment: 'Vua pha ky luc!'
    })

    // Join room va bat realtime
    await window.GoPortalGameSDK.subscribeRoom('room-id')
    window.GoPortalGameSDK.on('GAME_ROOM_STATE_UPDATED', (event) => {
      console.log('state update', event)
    })
  }

  bootGame().catch(console.error)
</script>
```

## 4) Luu y

- SDK nay hoat dong qua `postMessage` giua game iframe va GoPortal app shell.
- Neu game chay doc lap ngoai GoPortal, cac ham se khong co backend de xu ly.
- Nen goi `init()` som ngay sau khi game start de dam bao co `session_id`.
