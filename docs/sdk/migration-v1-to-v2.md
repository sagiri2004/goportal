# GoPortal SDK Migration Guide: v1 -> v2

Huong dan nay danh cho game team dang dung SDK v1 global script va muon chuyen sang v2.

## Tong quan thay doi

- Them `ready()` handshake truoc khi init command flow.
- Them command-style API qua `sdk.commands.*`.
- Them error code co cau truc (`error_code`) va `retryable`.
- Ho tro dong thoi browser script va npm package.

## 1) Browser script users

### Truoc (v1)

```html
<script src="./goportal-game-sdk.js"></script>
<script>
  await window.GoPortalGameSDK.init()
  await window.GoPortalGameSDK.shareScore(120)
</script>
```

### Sau (v2)

```html
<script src="./goportal-game-sdk.js"></script>
<script>
  await window.GoPortalGameSDK.ready()
  await window.GoPortalGameSDK.init({ metadata: { build: 'v2' } })
  await window.GoPortalGameSDK.commands.shareScore({ score: 120 })
</script>
```

Ghi chu: API cu (`shareScore(score, payload?)`) van ho tro 1 release cycle de migration mem.

## 2) React/Vite users

```ts
import { createGoPortalSDK } from '@goportal/game-sdk'

const sdk = createGoPortalSDK()
await sdk.ready()
await sdk.init({ metadata: { source: 'react-vite' } })
```

## 3) Error handling cap nhat

v2 tra loi bang `GoPortalSDKError`:

```ts
try {
  await sdk.commands.shareGame({ comment: 'hello' })
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message)
  }
}
```

Nen branch theo `code` trong `GoPortalSDKError` de retry/chuyen UX phu hop.

## 4) Compatibility checklist

- [ ] Game da goi `await sdk.ready()` truoc command dau tien.
- [ ] SDK script hoac npm package da cap nhat ban v2.
- [ ] Share flow da dung idempotency key (neu can tranh duplicate khi retry).
- [ ] Room sync flow test voi 2 clients (join/leave/sendState/getRoomState).
- [ ] Error path da hien thi message than thien theo `error_code`.

## 5) Rollout de xuat

1. Cap nhat sample + docs truoc.
2. Bat warning deprecation cho API cu trong moi truong dev.
3. Theo doi telemetry command errors 1-2 sprint.
4. Loai bo API cu o major tiep theo.
