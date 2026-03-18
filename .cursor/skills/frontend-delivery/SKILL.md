---
description: >
  Feature workflow skill. Read this before implementing any new feature.
  Triggers when user says: "build feature X", "implement screen X", "add X feature".
  Input: docs/backend-api/<domain>/<feature>.md + optional UI reference screenshot.
  Output: fully wired feature with real API (axios + TanStack Query).
globs: frontend/**
alwaysApply: false
---

# Frontend Delivery Skill

## Rules — load all of these before writing any code

Read every file in `.cursor/skills/frontend-delivery/rules/`:

| File | Covers |
|---|---|
| `000-master.mdc` | Monorepo folder structure, dependency graph, file placement |
| `001-stack-imports.mdc` | Locked stack, correct `@goportal/*` import paths |
| `002-colors-styling.mdc` | Design tokens, color mapping, spacing, typography |
| `003-component-patterns.mdc` | Component structure, naming, cn(), anti-patterns |
| `004-layout-discord.mdc` | AppShell, Server Rail, Channel Sidebar, Chat Area, Member Sidebar |
| `005-data-state-services.mdc` | Types, mock data, Zustand, TanStack Query, Socket.io |

These rules are **non-negotiable** and override all default React/Tailwind conventions.

---

## API Documentation — source of truth

All backend contracts live under `docs/backend-api/`. Map feature name to doc path:

```
auth              → docs/backend-api/auth/identity.md
users             → docs/backend-api/users/profile.md
social/friends    → docs/backend-api/social/friendship.md
social/block      → docs/backend-api/social/block.md
servers           → docs/backend-api/servers/management.md
roles             → docs/backend-api/roles/management.md
invites           → docs/backend-api/invites/management.md
channels          → docs/backend-api/channels/management.md
messages          → docs/backend-api/messages/management.md
uploads           → docs/backend-api/uploads/management.md
```

Always read the domain `README.md` first for context, then the feature file for the full contract.
Example for auth: read `docs/backend-api/auth/README.md` → then `docs/backend-api/auth/identity.md`.

If the requested feature has no matching doc file → **stop and ask the user**.

---

## UI Reference Image

If the user attaches a screenshot (Discord or the actual running app):

- Use it to infer **layout structure and component hierarchy only**
- **Never** copy colors from the image — always map to design tokens (`bg-surface`, `text-muted`, ...)
- **Never** create a new layout component if it already exists in `004-layout-discord.mdc`
- Resolution order: image → layout structure → component tree → discard all raw color/style values

---

## Existing Code — check before creating anything

Before creating any file, run these checks:

```bash
# Components already exist?
find frontend/packages/features/<feature>/src/components -name "*.tsx" 2>/dev/null

# Types already in models.ts?
grep -n "^export type\|^export interface" frontend/packages/types/models.ts

# Repo functions already exist?
find frontend/packages/services/src/repository -name "*.repo.ts" 2>/dev/null

# Store slices already exist?
find frontend/packages/store/src -name "*.store.ts" 2>/dev/null
```

If a file already exists: **extend or refactor it, never duplicate it**.

---

## Workflow — 5 steps, STRICT ORDER

```
STEP 1: PARSE    → Read doc, extract types and endpoints, present plan
STEP 2: TYPES    → Update packages/types/
STEP 3: MOCK     → Append to mockData.ts, mock repo functions
STEP 4: UI       → Build components with mock (must render before step 5)
STEP 5: WIRE     → Replace mock with real API
```

**Never skip a step. Never run steps in parallel.**
Step 4 must render correctly with mock data before step 5 begins.

---

## STEP 1 — PARSE

Read the doc files for the requested feature.
Extract and present this plan — **wait for user confirmation before writing any code**:

```
Feature: <NAME>

Endpoints:
  <METHOD> <PATH>  →  <auth: public|bearer>  →  returns <shape>
  ...

New types needed (packages/types/src/api.ts):
  - <TypeName> { field: type, ... }
  ...

models.ts changes (only if domain field):
  - <type> add <field>?: <type>   (optional to avoid breaking mocks)

Mock data to append (mockData.ts):
  - mock<TypeName>

Components to create:
  - <ComponentName>  →  packages/features/<feature>/src/components/

Hooks to create:
  - use<Action>()  →  useMutation | useQuery

Store updates:
  - <storeName>.store.ts: add <action>()
```

---

## STEP 2 — TYPES

### 2a. API DTOs → `packages/types/src/api.ts`

Create this file if it does not exist. Append to it if it does.

```ts
// packages/types/src/api.ts

// Shared response wrapper — matches backend shape
export type ApiResponse<T> = {
  success: boolean
  code:    string
  message: string
  data:    T
}

// --- AUTH ---
export type AuthUser = {
  id:       string
  username: string
  is_admin: boolean
}

export type LoginResponseData = {
  user:  AuthUser
  token: string
}

export type RegisterRequest = {
  username: string  // min 3 chars, trimmed
  password: string  // min 6 chars
}

export type LoginRequest = {
  username: string
  password: string
}

// Error code constants — one const object per domain
export const AUTH_ERROR_CODES = {
  INVALID_JSON:    'INVALID_JSON',
  USERNAME_EXISTS: 'USERNAME_EXISTS',
  BAD_CREDENTIALS: 'BAD_CREDENTIALS',
} as const
export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES]
```

Follow this pattern for every domain. Append new types — never overwrite existing ones.

### 2b. `models.ts` — touch ONLY for core domain fields

```ts
// packages/types/models.ts
// Only add a field here when it belongs to the domain model permanently.
// Always make new fields optional to avoid breaking existing mock data.

export type User = {
  id:          string
  username:    string
  avatarColor: string
  status:      'online' | 'offline' | 'idle' | 'dnd'
  is_admin?:   boolean   // added when backend confirms it is a domain field
}
```

---

## STEP 3 — MOCK DATA

**Only one mock file exists in the entire monorepo.**
Always append to `packages/features/dashboard/mockData.ts` — never create a new mock file.

```ts
// packages/features/dashboard/mockData.ts  (APPEND — do not remove existing exports)

import type { AuthUser, LoginResponseData } from '@goportal/types'

export const mockAuthUser: AuthUser = {
  id:       '8d3f6506-6569-4b31-a74a-d9d43c359ee5',
  username: 'zutomayo',
  is_admin: false,
}

export const mockLoginResponse: LoginResponseData = {
  user:  mockAuthUser,
  token: 'mock-jwt-token-for-development',
}

// Use this in every mock repo function to simulate network latency
export const simulateDelay = (ms = 400): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))
```

Mock data must look realistic — use Discord-like usernames, server names, channel names,
and message content. Never use "foo", "bar", "test123", or lorem ipsum.

---

## STEP 4 — UI with Mock Data

Build in this order: repo → hook → component → view → index export.

### 4a. Repo — mock implementation with TODO marker

```ts
// packages/services/src/repository/auth.repo.ts

import type { RegisterRequest, LoginRequest, LoginResponseData, AuthUser } from '@goportal/types'
import { mockAuthUser, mockLoginResponse, simulateDelay } from '@goportal/feature-dashboard/mockData'

export const authRepo = {
  register: async (body: RegisterRequest): Promise<AuthUser> => {
    // TODO: replace with real API — STEP 5
    await simulateDelay()
    return { ...mockAuthUser, username: body.username.trim() }
  },

  login: async (body: LoginRequest): Promise<LoginResponseData> => {
    // TODO: replace with real API — STEP 5
    await simulateDelay()
    return mockLoginResponse
  },
}
```

### 4b. Zustand store slice

```ts
// packages/store/src/auth.store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@goportal/types'

type AuthState = {
  user:            AuthUser | null
  token:           string | null
  isAuthenticated: boolean
  setUser:         (user: AuthUser) => void
  setToken:        (token: string) => void
  logout:          () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,
      setUser:  (user)  => set({ user, isAuthenticated: true }),
      setToken: (token) => set({ token }),
      logout:   ()      => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name:        'goportal-auth',
      partialize:  (state) => ({ token: state.token, user: state.user }),
    }
  )
)
```

### 4c. TanStack Query hooks

```ts
// packages/features/auth/src/hooks/useLogin.ts

import { useMutation } from '@tanstack/react-query'
import { authRepo }    from '@goportal/services'
import { useAuthStore } from '@goportal/store'
import type { LoginRequest } from '@goportal/types'

export const useLogin = () => {
  const { setUser, setToken } = useAuthStore()
  return useMutation({
    mutationFn: (body: LoginRequest) => authRepo.login(body),
    onSuccess:  (data) => { setUser(data.user); setToken(data.token) },
  })
}

// packages/features/auth/src/hooks/useRegister.ts

import { useMutation }      from '@tanstack/react-query'
import { authRepo }         from '@goportal/services'
import type { RegisterRequest } from '@goportal/types'

export const useRegister = () =>
  useMutation({ mutationFn: (body: RegisterRequest) => authRepo.register(body) })
```

### 4d. Validation — derived strictly from "Frontend Notes" in the API doc

```ts
// Extract validation rules from the doc's "Frontend Notes" section.
// Never invent constraints the doc does not specify.

type FieldErrors<T> = Partial<Record<keyof T, string>>

const validateRegister = (username: string, password: string): FieldErrors<RegisterRequest> => {
  const e: FieldErrors<RegisterRequest> = {}
  if (username.trim().length < 3) e.username = 'Username must be at least 3 characters'
  if (password.length < 6)        e.password = 'Password must be at least 6 characters'
  return e
}
```

### 4e. Form component

Required states for every form component:
- **Field errors** — displayed below the input in `text-danger`
- **API error** — mapped from error code constant, shown inline
- **Loading** — `isPending` disables the submit button and changes label text
- **Empty / initial** — inputs clear, no errors shown

```tsx
// packages/features/auth/src/components/LoginForm.tsx

import React, { useState } from 'react'
import { cn }       from '@goportal/ui'
import { Button }   from '@goportal/ui/components/button'
import { Input }    from '@goportal/ui/components/input'
import { useLogin } from '../hooks/useLogin'
import type { LoginRequest } from '@goportal/types'
import { AUTH_ERROR_CODES }  from '@goportal/types'

type LoginFormProps = {
  onSuccess:          () => void
  onSwitchToRegister: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [form, setForm]               = useState<LoginRequest>({ username: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<Partial<LoginRequest>>({})
  const login = useLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Partial<LoginRequest> = {}
    if (form.username.trim().length < 3) errors.username = 'Min 3 characters'
    if (form.password.length < 6)        errors.password = 'Min 6 characters'
    if (Object.keys(errors).length) { setFieldErrors(errors); return }

    login.mutate(
      { username: form.username.trim(), password: form.password },
      {
        onSuccess,
        onError: (err: any) => {
          const code = err?.response?.data?.code
          if (code === AUTH_ERROR_CODES.BAD_CREDENTIALS)
            setFieldErrors({ password: 'Invalid username or password' })
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">Username</label>
        <Input
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          placeholder="Enter your username"
          autoComplete="username"
          className={cn(fieldErrors.username && 'border-danger focus-visible:ring-danger')}
        />
        {fieldErrors.username && <p className="text-xs text-danger">{fieldErrors.username}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">Password</label>
        <Input
          type="password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          placeholder="Enter your password"
          autoComplete="current-password"
          className={cn(fieldErrors.password && 'border-danger focus-visible:ring-danger')}
        />
        {fieldErrors.password && <p className="text-xs text-danger">{fieldErrors.password}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? 'Logging in...' : 'Log In'}
      </Button>

      <p className="text-xs text-muted text-center">
        Need an account?{' '}
        <button type="button" onClick={onSwitchToRegister}
          className="text-primary hover:underline font-medium">
          Register
        </button>
      </p>
    </form>
  )
}
```

### 4f. View — compose components, manage local mode state

```tsx
// packages/features/auth/src/components/AuthView.tsx

import React, { useState } from 'react'
import { LoginForm }    from './LoginForm'
import { RegisterForm } from './RegisterForm'

type AuthViewProps = { onAuthenticated: () => void }
type Mode = 'login' | 'register'

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<Mode>('login')
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md bg-surface rounded-lg shadow-2xl px-8 py-10 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">
            {mode === 'login' ? 'Welcome back!' : 'Create an account'}
          </h1>
          <p className="text-sm text-muted">
            {mode === 'login' ? "We're so excited to see you again!" : 'Join your friends.'}
          </p>
        </div>
        {mode === 'login'
          ? <LoginForm onSuccess={onAuthenticated} onSwitchToRegister={() => setMode('register')} />
          : <RegisterForm onSuccess={() => setMode('login')} onSwitchToLogin={() => setMode('login')} />
        }
      </div>
    </div>
  )
}
```

### 4g. Feature index — re-export everything public

```ts
// packages/features/auth/src/index.ts

export { AuthView }     from './components/AuthView'
export { LoginForm }    from './components/LoginForm'
export { RegisterForm } from './components/RegisterForm'
export { useLogin }     from './hooks/useLogin'
export { useRegister }  from './hooks/useRegister'
```

**Step 4 gate:** Run `npx tsc --noEmit` from `frontend/`. Zero errors required before step 5.

---

## STEP 5 — Wire Real API

Only begin when:
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] UI renders correctly with mock data
- [ ] User confirms backend is running

### 5a. Axios client — create if missing

```ts
// packages/services/src/api/client.ts

import axios from 'axios'
import { API_URL } from '@goportal/config'
import { useAuthStore } from '@goportal/store'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) useAuthStore.getState().logout()
    return Promise.reject(err)
  }
)
```

### 5b. Replace mock in repo with real API call

```ts
// packages/services/src/repository/auth.repo.ts
// Remove simulateDelay and mock imports. Wire real endpoints.

import type { RegisterRequest, LoginRequest, LoginResponseData, AuthUser, ApiResponse } from '@goportal/types'
import { apiClient } from '../api/client'

export const authRepo = {
  register: async (body: RegisterRequest): Promise<AuthUser> => {
    const res = await apiClient.post<ApiResponse<AuthUser>>('/api/v1/auth/register', body)
    return res.data.data
  },
  login: async (body: LoginRequest): Promise<LoginResponseData> => {
    const res = await apiClient.post<ApiResponse<LoginResponseData>>('/api/v1/auth/login', body)
    return res.data.data
  },
}
```

### 5c. Config — env vars accessed only through `@goportal/config`

```ts
// packages/config/src/env.ts

export const API_URL = import.meta.env.VITE_API_URL  ?? 'http://localhost:8080'
export const WS_URL  = import.meta.env.VITE_WS_URL   ?? 'ws://localhost:8080'
export const LK_URL  = import.meta.env.VITE_LIVEKIT_URL ?? 'ws://localhost:7880'
```

```bash
# frontend/.env.example — update after every new env variable
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
VITE_LIVEKIT_URL=ws://localhost:7880
```

Never access `import.meta.env.*` directly in components, hooks, or repos.
Always import from `@goportal/config`.

---

## File Output Map

```
packages/
├── types/
│   ├── models.ts                    UPDATE — optional fields only, never break mocks
│   └── src/
│       └── api.ts                   CREATE or APPEND — DTOs + error code consts
│
├── config/
│   └── src/
│       └── env.ts                   UPDATE — add new VITE_* vars
│
├── services/
│   └── src/
│       ├── api/
│       │   └── client.ts            CREATE if missing
│       └── repository/
│           └── <feature>.repo.ts    CREATE per feature
│
├── store/
│   └── src/
│       └── <feature>.store.ts       CREATE per feature
│
└── features/
    ├── dashboard/
    │   └── mockData.ts              APPEND — single mock file for entire monorepo
    └── <feature>/
        └── src/
            ├── components/
            │   └── *.tsx            CREATE or REWRITE
            ├── hooks/
            │   └── use*.ts          CREATE
            └── index.ts             APPEND exports
```

---

## Completion Checklist

```
STEP 1 — PARSE
  [ ] Read docs/backend-api/<domain>/README.md
  [ ] Read docs/backend-api/<domain>/<feature>.md
  [ ] Listed: endpoints, types, components, hooks, store changes
  [ ] User confirmed the plan — no code written yet

STEP 2 — TYPES
  [ ] ApiResponse<T> wrapper exists in packages/types/src/api.ts
  [ ] DTOs for request and response shapes added
  [ ] Error code const object added (AUTH_ERROR_CODES, etc.)
  [ ] models.ts updated with optional fields if needed

STEP 3 — MOCK
  [ ] Mock data appended to packages/features/dashboard/mockData.ts
  [ ] simulateDelay() used in all mock repo functions
  [ ] Mock data looks realistic (Discord-like content)

STEP 4 — UI
  [ ] Repo with mock implementation + "TODO: replace with real API — STEP 5" comment
  [ ] Zustand store slice with correct state shape
  [ ] useMutation or useQuery hook
  [ ] Form validation derived from "Frontend Notes" in the API doc
  [ ] Field-level error display (text-danger below input)
  [ ] API error code mapped to user-facing message
  [ ] Loading state: isPending → button disabled + label change
  [ ] Empty state with icon + message (for list components)
  [ ] Skeleton loader (for list/content components)
  [ ] Zero hardcoded colors — design tokens only
  [ ] index.ts exports updated
  [ ] npx tsc --noEmit → zero errors

STEP 5 — WIRE
  [ ] Axios client created with base URL from @goportal/config
  [ ] Bearer token interceptor attached
  [ ] 401 interceptor triggers logout()
  [ ] Mock replaced with real API call in repo
  [ ] Store uses zustand/persist for auth token
  [ ] frontend/.env.example updated with new VITE_* variables
  [ ] Manual smoke test against running backend
```
