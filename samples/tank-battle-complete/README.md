# Tank Battle Complete (GoPortal SDK v2)

Sample nay la game ban xe tang hoan chinh de test gan nhu full luong SDK v2 trong 1 build HTML duy nhat.

## SDK features covered

- Lifecycle: `ready()` + `init()`
- Realtime room flow: `createRoom`, `joinRoom`, `leaveRoom`, `subscribeRoom`, `getRoomState`
- State sync: `sendState`
- Share APIs:
  - `shareScore`
  - `shareAchievement`
  - `shareGame`
  - `commands.shareSessionStart`
- Share status event: `gop.sdk.share_status` (`opened/submitted/shared/cancelled/failed`)

## Controls

- Move: `W A S D` or Arrow keys
- Shoot: `Space`
- Top panel:
  - Create room / Join room / Leave room / Sync room
  - Share now playing / score / achievement / game card

## Run locally (quick check)

Open `index.html` with a static server (or via GoPortal upload flow).

## Prepare zip for GoPortal upload

Copy SDK browser bundle into this folder as `goportal-game-sdk.js`, then zip both files:

- `index.html`
- `goportal-game-sdk.js`

Example (PowerShell, run from repo root):

```powershell
Copy-Item ".\game-sdk\browser\goportal-game-sdk.js" ".\samples\tank-battle-complete\goportal-game-sdk.js" -Force
Compress-Archive -Path ".\samples\tank-battle-complete\index.html", ".\samples\tank-battle-complete\goportal-game-sdk.js" -DestinationPath ".\samples\tank-battle-complete\tank-battle-complete.zip" -Force
```

Upload `tank-battle-complete.zip` in GoPortal game build.

