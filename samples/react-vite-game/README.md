# React/Vite Game Sample (SDK v2)

Sample nay minh hoa cach game team tich hop SDK theo kieu npm package, phu hop voi React/Vite.

## Chay local

```powershell
cd samples/react-vite-game
npm install
npm run dev
```

## Build de upload

```powershell
cd samples/react-vite-game
npm install
npm run build
```

Sau khi build, zip tat ca file ben trong `dist/` (khong zip thu muc cha) roi upload build zip len GoPortal.

## Cac diem chinh

- Dung `createGoPortalSDK()` tu `@goportal/game-sdk`
- Goi `await sdk.ready()` truoc `sdk.init(...)`
- Dung `sdk.commands.shareScore(...)` theo command-style API v2
