---
description: >
  Feature workflow skill. Read this before implementing any new feature.
  Triggers when user says: "build feature X", "implement screen X", "add X feature".
  Input: docs/backend-api/<feature>.md + optional UI reference screenshot.
  Output: fully wired feature with real API (axios + TanStack Query).
globs: frontend/**
alwaysApply: false
---

# Feature Workflow Skill

## Input Sources — read before writing any code

### 1. API Documentation
Locate the doc file under `docs/api/` by feature name:

```
docs/backend-api/auth.md          → feature: auth
docs/backend-api/channels.md      → feature: channels
docs/backend-api/messages.md      → feature: chat
docs/backend-api/servers.md       → feature: server-list
docs/backend-api/users.md         → feature: user-profile
docs/backend-api/files.md         → feature: file-upload
docs/backend-api/voice.md         → feature: voice
```

If no matching file exists → ask the user before proceeding.

### 2. UI Reference Image
If the user attaches a screenshot (Discord or actual app):
- Use it to infer **layout structure and component hierarchy only**
- **Never** copy colors from the image — always map to design tokens (`bg-surface`, `text-muted`, ...)
- **Never** create a new component if the layout already exists in `004-layout-discord.mdc`
- Priority order: image → layout structure → component tree → ignore all raw color/style values

### 3. Existing Code — check before creating anything
Before creating any file, verify what already exists:

```bash
# Existing components?
find frontend/packages/features/<feature>/src/components -name "*.tsx" 2>/dev/null

# Types already in models.ts?
grep -n "type\|interface" frontend/packages/types/models.ts

# Existing repo functions?
find frontend/packages/services/src/repository -name "*.repo.ts" 2>/dev/null
```

---

## Workflow — 5 steps, STRICT ORDER

```
STEP 1: PARSE    → Read doc, extract types and endpoints
STEP 2: TYPES    → Update packages/types/
STEP 3: MOCK     → Create/update mock data
STEP 4: UI       → Build components against mock (must run before step 5)
STEP 5: WIRE     → Replace mock with real API (repo → hook → component)
```

Never skip a step. Never run steps in parallel.
Step 4 must render correctly with mock data before step 5 begins.

---

## STEP 1 — PARSE

Read the doc file, extract:

```
ENDPOINTS:
  - Method, path, auth requirement
  - Request body shape
  - Success response data shape
  - Error codes and their meanings

BUSINESS RULES (from "Frontend Notes" section):
  - Validation constraints (min length, format, trim...)
  - Token/session requirements
  - Side effects (redirect, store update, toast...)
  - Edge cases to handle in UI
```

**Output of this step** — no code yet, only a plan:

```
Feature: AUTH
Endpoints:
  POST /api/v1/auth/register  → public  → returns AuthUser
  POST /api/v1/auth/login     → public  → returns { user: AuthUser, token: string }

Types to add/update in models.ts:
  - AuthUser { id, username, is_admin }     ← from response shape
  - LoginResponseData { user, token }

Types already available — reuse:
  - User (exists, add is_admin? as optional — do not break existing mocks)

Mock data to create:
  - mockAuthUser
  - mockLoginResponse

Components to create:
  - LoginForm
  - RegisterForm
  - AuthView (already exists — refactor to use new forms)

Repo functions to create:
  - authRepo.register(username, password)
  - authRepo.login(username, password)

Hooks to create:
  - useLogin()    — useMutation
  - useRegister() — useMutation

Store updates:
  - authStore: setUser(), setToken(), logout()
```

**Show this plan to the user and wait for confirmation before continuing.**

---

## STEP 2 — TYPES

### 2a. Response/Request DTOs — add to `packages/types/src/api.ts`

```ts
// packages/types/src/api.ts

export type ApiResponse<T> = {
  success: boolean
  code: string
  message: string
  data: T
}

export type AuthUser = {
  id: string
  username: string
  is_admin: boolean
}

export type LoginResponseData = {
  user: AuthUser
  token: string
}

export type RegisterRequest = {
  username: string   // min 3 chars
  password: string   // min 6 chars
}

export type LoginRequest = {
  username: string
  password: string
}
```

### 2b. Error codes — typed enum per feature

```ts
// packages/types/src/api.ts (append)

export const AUTH_ERROR_CODES = {
  INVALID_JSON:    'INVALID_JSON',
  USERNAME_EXISTS: 'USERNAME_EXISTS',
  BAD_CREDENTIALS: 'BAD_CREDENTIALS',
} as const

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES]
```

### 2c. Update `models.ts` ONLY for core domain fields

```ts
// Only touch models.ts when the new field belongs to the domain model,
// not just to an API response shape.

// Example: adding is_admin to User
export type User = {
  id: string
  username: string
  avatarColor: string
  status: 'online' | 'offline' | 'idle' | 'dnd'
  is_admin?: boolean    // optional — does not break existing mock data
}
```

---

## STEP 3 — MOCK DATA

Append to `packages/features/dashboard/mockData.ts`.
Never create a new mock file elsewhere.

```ts
// packages/features/dashboard/mockData.ts (append)

import type { AuthUser, LoginResponseData } from '@goportal/types'

export const mockAuthUser: AuthUser = {
  id: '8d3f6506-6569-4b31-a74a-d9d43c359ee5',
  username: 'zutomayo',
  is_admin: false,
}

export const mockLoginResponse: LoginResponseData = {
  user: mockAuthUser,
  token: 'mock-jwt-token-for-development',
}

// Simulate async network delay in mock repos
export const simulateDelay = (ms = 400): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))
```

---

## STEP 4 — UI with Mock Data

### 4a. Repo — mock implementation first

```ts
// packages/services/src/repository/auth.repo.ts

import type { RegisterRequest, LoginRequest, LoginResponseData, AuthUser } from '@goportal/types'
import { mockAuthUser, mockLoginResponse, simulateDelay } from '@goportal/feature-dashboard/mockData'
import { apiClient } from '../api/client'

export const authRepo = {
  register: async (body: RegisterRequest): Promise<AuthUser> => {
    // TODO: replace with real API — see STEP 5
    await simulateDelay()
    return { ...mockAuthUser, username: body.username }
  },

  login: async (body: LoginRequest): Promise<LoginResponseData> => {
    // TODO: replace with real API — see STEP 5
    await simulateDelay()
    return mockLoginResponse
  },
}
```

### 4b. TanStack Query hooks

```ts
// packages/features/auth/src/hooks/useLogin.ts

import { useMutation } from '@tanstack/react-query'
import { authRepo } from '@goportal/services'
import { useAuthStore } from '@goportal/store'
import type { LoginRequest } from '@goportal/types'
import { AUTH_ERROR_CODES } from '@goportal/types'

export const useLogin = () => {
  const { setUser, setToken } = useAuthStore()

  return useMutation({
    mutationFn: (body: LoginRequest) => authRepo.login(body),
    onSuccess: (data) => {
      setUser(data.user)
      setToken(data.token)
    },
  })
}
```

```ts
// packages/features/auth/src/hooks/useRegister.ts

import { useMutation } from '@tanstack/react-query'
import { authRepo } from '@goportal/services'
import type { RegisterRequest } from '@goportal/types'

export const useRegister = () =>
  useMutation({
    mutationFn: (body: RegisterRequest) => authRepo.register(body),
  })
```

### 4c. Validation — derived from "Frontend Notes" in the doc

```ts
// Validation rules come from the API doc, not invented by the agent.
// Example from auth doc: username min 3, password min 6, trim username

type FormErrors<T> = Partial<Record<keyof T, string>>

const validateLogin = (username: string, password: string): FormErrors<LoginRequest> => {
  const errors: FormErrors<LoginRequest> = {}
  if (username.trim().length < 3) errors.username = 'Username must be at least 3 characters'
  if (password.length < 6)        errors.password = 'Password must be at least 6 characters'
  return errors
}
```

### 4d. Form component — design tokens only, no hardcoded colors

```tsx
// packages/features/auth/src/components/LoginForm.tsx

import React, { useState } from 'react'
import { cn } from '@goportal/ui'
import { Button } from '@goportal/ui/components/button'
import { Input } from '@goportal/ui/components/input'
import { useLogin } from '../hooks/useLogin'
import type { LoginRequest } from '@goportal/types'
import { AUTH_ERROR_CODES } from '@goportal/types'

type LoginFormProps = {
  onSuccess: () => void
  onSwitchToRegister: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [form, setForm]             = useState<LoginRequest>({ username: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<Partial<LoginRequest>>({})
  const login = useLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Partial<LoginRequest> = {}
    if (form.username.trim().length < 3) errors.username = 'Min 3 characters'
    if (form.password.length < 6)        errors.password = 'Min 6 characters'
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }

    login.mutate(
      { username: form.username.trim(), password: form.password },
      {
        onSuccess,
        onError: (err: any) => {
          const code = err?.response?.data?.code
          if (code === AUTH_ERROR_CODES.BAD_CREDENTIALS) {
            setFieldErrors({ password: 'Invalid username or password' })
          }
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Username */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">
          Username
        </label>
        <Input
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          placeholder="Enter your username"
          autoComplete="username"
          className={cn(fieldErrors.username && 'border-danger focus-visible:ring-danger')}
        />
        {fieldErrors.username && (
          <p className="text-xs text-danger">{fieldErrors.username}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">
          Password
        </label>
        <Input
          type="password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          placeholder="Enter your password"
          autoComplete="current-password"
          className={cn(fieldErrors.password && 'border-danger focus-visible:ring-danger')}
        />
        {fieldErrors.password && (
          <p className="text-xs text-danger">{fieldErrors.password}</p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? 'Logging in...' : 'Log In'}
      </Button>

      {/* Switch mode */}
      <p className="text-xs text-muted text-center">
        Need an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-primary hover:underline font-medium"
        >
          Register
        </button>
      </p>
    </form>
  )
}
```

### 4e. View — compose forms, manage mode state

```tsx
// packages/features/auth/src/components/AuthView.tsx

import React, { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

type Mode = 'login' | 'register'

type AuthViewProps = {
  onAuthenticated: () => void
}

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
            {mode === 'login'
              ? "We're so excited to see you again!"
              : 'Join the server with your friends.'}
          </p>
        </div>

        {mode === 'login' ? (
          <LoginForm
            onSuccess={onAuthenticated}
            onSwitchToRegister={() => setMode('register')}
          />
        ) : (
          <RegisterForm
            onSuccess={() => setMode('login')}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  )
}
```

### 4f. Feature index — re-export everything

```ts
// packages/features/auth/src/index.ts

export { AuthView }     from './components/AuthView'
export { LoginForm }    from './components/LoginForm'
export { RegisterForm } from './components/RegisterForm'
export { useLogin }     from './hooks/useLogin'
export { useRegister }  from './hooks/useRegister'
```

**Step 4 checkpoint:** Component must render with mock data and have zero TypeScript errors before proceeding.

---

## STEP 5 — Wire Real API

Only begin this step when:
- [ ] Step 4 is complete — UI renders correctly with mock data
- [ ] User confirms backend is running and accessible

### 5a. Axios client

```ts
// packages/services/src/api/client.ts

import axios from 'axios'
import { useAuthStore } from '@goportal/store'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
})

// Attach Bearer token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(err)
  }
)
```

### 5b. Replace mock with real API call in repo

```ts
// packages/services/src/repository/auth.repo.ts
// Remove mock implementation, uncomment real calls

import type {
  RegisterRequest, LoginRequest,
  LoginResponseData, AuthUser, ApiResponse
} from '@goportal/types'
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

### 5c. Auth store with persistence

```ts
// packages/store/src/auth.store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@goportal/types'

type AuthState = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  setUser:  (user: AuthUser) => void
  setToken: (token: string) => void
  logout:   () => void
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
      name: 'goportal-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)
```

### 5d. Update environment files

```bash
# frontend/.env.example — add new variables
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
VITE_LIVEKIT_URL=ws://localhost:7880
```

---

## File Output Map — one feature (auth)

```
packages/
├── types/
│   ├── models.ts                        UPDATE if domain field added
│   └── src/
│       └── api.ts                       CREATE or APPEND DTOs + error codes
├── services/
│   └── src/
│       ├── api/
│       │   └── client.ts                CREATE if missing
│       └── repository/
│           └── auth.repo.ts             CREATE
├── store/
│   └── src/
│       └── auth.store.ts                CREATE
└── features/
    ├── dashboard/
    │   └── mockData.ts                  APPEND new mocks
    └── auth/
        └── src/
            ├── components/
            │   ├── AuthView.tsx         REWRITE using new forms
            │   ├── LoginForm.tsx        CREATE
            │   └── RegisterForm.tsx     CREATE
            ├── hooks/
            │   ├── useLogin.ts          CREATE
            │   └── useRegister.ts       CREATE
            └── index.ts                 APPEND exports
```

---

## Completion Checklist

```
STEP 1 — PARSE
  [ ] Read docs/api/<feature>.md
  [ ] List endpoints, types, components, hooks needed
  [ ] User confirmed the plan

STEP 2 — TYPES
  [ ] DTOs in packages/types/src/api.ts
  [ ] Error codes enum
  [ ] models.ts updated with optional fields if needed

STEP 3 — MOCK
  [ ] Mock data appended to mockData.ts
  [ ] simulateDelay() used in mock repo

STEP 4 — UI
  [ ] Repo with mock implementation + TODO comments
  [ ] useMutation / useQuery hooks
  [ ] Form validation based on Frontend Notes in doc
  [ ] Field-level error display
  [ ] API error mapped to error code constants
  [ ] Loading state (isPending, disabled button, spinner text)
  [ ] Empty state where applicable
  [ ] Skeleton loader where applicable
  [ ] Design tokens only — zero hardcoded colors
  [ ] index.ts exports updated
  [ ] Zero TypeScript errors

STEP 5 — WIRE
  [ ] Axios client configured with base URL from env
  [ ] Bearer token interceptor attached
  [ ] 401 interceptor calls logout()
  [ ] Mock replaced with real API calls in repo
  [ ] Auth store uses zustand/persist
  [ ] .env.example updated with new variables
  [ ] Manual test against real backend
```
