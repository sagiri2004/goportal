# Single Player Score Sample

Demo game 1 nguoi choi de test:

- SDK `init` theo session
- `shareScore(..., { share: false })` de luu diem moi round
- `shareScore(..., { share: true })` de share diem len chat
- `idempotency_key` cho moi lan ghi/share score

## File chinh

- `samples/single-player-score/index.html`

## Chay local trong repo

`index.html` da link truc tiep:

- `./goportal-game-sdk.js`

Can copy SDK file vao cung thu muc voi `index.html`:

- Nguon SDK: `game-sdk/browser/goportal-game-sdk.js`

## Zip de upload len GoPortal

Khi zip upload, can dam bao ca `index.html` va `goportal-game-sdk.js` nam o root cua zip.

PowerShell (tu repo root):

```powershell
Copy-Item "game-sdk\browser\goportal-game-sdk.js" "samples\single-player-score\goportal-game-sdk.js" -Force
Compress-Archive -Path "samples\single-player-score\index.html","samples\single-player-score\goportal-game-sdk.js" -DestinationPath "single-player-score.zip" -Force
```
