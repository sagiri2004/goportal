# Build Web + Desktop Frontend

## Purpose

Run and build the shared React + TypeScript + Tailwind frontend for:

- Web (`apps/web`)
- Electron desktop shell (`apps/desktop`)

## Prerequisites

- Node.js 20+
- npm 10+

## Install dependencies

```bash
cd frontend
npm install
```

## Run in development

### Web only

```bash
npm run dev:web
```

### Desktop (Electron + Web dev server)

```bash
npm run dev:desktop
```

## Build

### Web build

```bash
npm run build:web
```

### Desktop build-ready output

```bash
npm run build:desktop
```

This currently builds renderer assets and keeps Electron shell ready to load `apps/web/dist/index.html`.

## Troubleshooting

- If Electron fails on Linux sandbox:
  - run desktop with `--no-sandbox` (already configured in desktop dev script).
- If aliases fail:
  - check `apps/web/vite.config.ts` and `tooling/tsconfig/base.json`.
- If Tailwind classes do not apply:
  - verify `apps/web/tailwind.config.cjs` includes `packages/*` content paths.

