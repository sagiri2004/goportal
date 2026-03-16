# Frontend Workspace (Web + Electron)

This frontend is a shared React + TypeScript + Tailwind workspace that powers:

- Web app (Vite)
- Desktop app shell (Electron)

It contains Discord-style mock UI screens for:

- Login
- Register
- Post-login dashboard

## Folder Overview

```text
frontend/
├── apps/
│   ├── web/        # Vite entry (browser)
│   └── desktop/    # Electron shell
├── packages/
│   ├── app-core/   # Shared app shell and state flow
│   ├── features/   # Domain features (auth, dashboard)
│   ├── ui/         # Shared Tailwind UI components
│   ├── types/      # Shared TS models
│   ├── services/   # API/sdk adapters (future)
│   └── config/     # Runtime config (future)
└── tooling/        # Shared Tailwind/TS configs
```

## Requirements

- Node.js 20+
- npm 10+

## Install

```bash
cd frontend
npm install
```

## Run (Web)

```bash
npm run dev:web
```

Open `http://localhost:5173`.

## Build (Web)

```bash
npm run build:web
```

Output: `apps/web/dist/`.

## Run (Desktop / Electron)

```bash
npm run dev:desktop
```

This starts:

- Vite dev server (`apps/web`)
- Electron shell (`apps/desktop`)

## Build (Desktop)

```bash
npm run build:desktop
```

Current desktop build compiles renderer (web dist) and prepares Electron shell for runtime loading.
It does **not** package an installer yet.

## Notes

- UI currently uses mock data only.
- Authentication is local state/localStorage mock flow.
- Next step is wiring real API calls in `packages/services`.

