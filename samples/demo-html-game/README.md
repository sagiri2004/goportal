# Demo HTML game (upload test)

Single-file game: `index.html` at the **root** of the zip (required by GoPortal).

## Ready-made zip

`samples/demo-html-game/demo-game.zip` is already built with `index.html` at the zip root — you can upload that file directly.

## Zip correctly (if you rebuild)

The archive must contain `index.html` at the top level, not inside another folder.

### PowerShell (from repo root)

```powershell
Compress-Archive -Path "samples\demo-html-game\index.html" -DestinationPath "demo-game.zip" -Force
```

### Or manually

1. Open `samples/demo-html-game/`.
2. Select **only** `index.html`.
3. Right-click → Send to → Compressed (zipped) folder → name it `demo-game.zip`.

Do **not** zip the whole `demo-html-game` folder unless your tool puts `index.html` at zip root (some tools add a parent folder — that will fail validation).

## Test in GoPortal

1. Open `/app/games`.
2. Fill title, slug (e.g. `tap-demo`), choose `demo-game.zip`.
3. Submit → you should land on the play page with the game in an iframe.
