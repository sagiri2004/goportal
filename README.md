# goportal

A prototype real-time streaming project (WebRTC) with a Go backend and a React/Electron/TypeScript/Tailwind frontend/app, using LiveKit as the media server.

## Run

```bash
cd backend
go mod tidy
go run . -config configs/config.yaml -migrate -seed
```

```bash
cd frontend
npm install
npm run dev:web
```

```bash
cd frontend
npm run dev:desktop
```