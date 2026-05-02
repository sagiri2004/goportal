# Multiplayer Tank Room Sample

Demo game realtime multiplayer de test room features:

- Tao/join/leave room
- Subscribe room event qua `GoPortalGameSDK.on('*', ...)`
- Dong bo state qua `sendState(roomId, state, stateVersion)`
- Manual sync qua `getRoomState`
- Nut `Force Version Gap` de demo co che auto-resync khi `state_version` lech

## File chinh

- `samples/multiplayer-tank-room/index.html`

## Hanh vi demo quan trong

1. Mo 2 tab/client, cung join cung `room_id`.
2. Di chuyen va ban (WASD/Arrow + Space), state duoc sync qua room events.
3. Bam `Force Version Gap` o 1 tab -> tab con lai se nhan gap version va auto fallback `getRoomState` (do SDK/client moi da ho tro).

## Zip de upload len GoPortal

PowerShell (tu repo root):

```powershell
Copy-Item "game-sdk\browser\goportal-game-sdk.js" "samples\multiplayer-tank-room\goportal-game-sdk.js" -Force
Compress-Archive -Path "samples\multiplayer-tank-room\index.html","samples\multiplayer-tank-room\goportal-game-sdk.js" -DestinationPath "multiplayer-tank-room.zip" -Force
```
