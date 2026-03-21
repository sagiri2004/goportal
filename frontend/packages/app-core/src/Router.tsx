/**
 * App Router
 *
 * Main routing setup for the application:
 * - Public routes: /auth/login, /auth/register
 * - Protected routes: /app/* (all require authentication)
 * - Fallback: redirect to /auth/login
 */

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { PrivateRoute } from './PrivateRoute'
import { AppShell } from './layout/AppShell'
import { AuthView } from '@goportal/feature-auth'
import { DashboardView, VoiceChannelView } from '@goportal/feature-dashboard'
import { MessageCircle, Plus, Search, MessagesSquare } from 'lucide-react'
import { useAuthStore } from '@goportal/store'
import { getChannels, getServers, hydrateSession } from './services'
import { APP_NAME } from '@goportal/config'

type LastVisited = {
  serverId: string
  channelId: string
}

const POST_AUTH_REDIRECT_KEY = 'goportal_post_auth_redirect'
const PENDING_INVITE_CODE_KEY = 'goportal_pending_invite_code'

const readLastVisited = (): LastVisited | null => {
  try {
    const raw = localStorage.getItem('last_visited')
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<LastVisited>
    if (!parsed.serverId || !parsed.channelId) {
      return null
    }
    return {
      serverId: parsed.serverId,
      channelId: parsed.channelId,
    }
  } catch {
    return null
  }
}

const AppIndexRedirect: React.FC = () => {
  const navigate = useNavigate()

  React.useEffect(() => {
    let cancelled = false

    const resolveRedirect = async () => {
      try {
        const servers = await getServers()

        if (cancelled) {
          return
        }

        if (servers.length === 0) {
          navigate('/app/@me', { replace: true })
          return
        }

        const last = readLastVisited()
        const validLast = last && servers.find((server) => server.id === last.serverId)

        if (validLast && last) {
          navigate(`/app/servers/${last.serverId}/channels/${last.channelId}`, { replace: true })
          return
        }

        const first = servers[0]
        const channels = await getChannels(first.id)

        if (cancelled) {
          return
        }

        const flatChannels = channels.categories.flatMap((category) => category.channels)
        const firstText = flatChannels.find((channel) => channel.type === 'text') ?? flatChannels[0]

        if (!firstText) {
          navigate('/app/@me', { replace: true })
          return
        }

        navigate(`/app/servers/${first.id}/channels/${firstText.id}`, { replace: true })
      } catch {
        navigate('/app/@me', { replace: true })
      }
    }

    void resolveRedirect()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  )
}

type DmOutletContext = {
  serverCount: number
  shouldShowOnboarding: boolean
  dismissOnboarding: () => void
  openCreateServerModal: () => void
  showDevelopingToast: () => void
}

const DMHomePage: React.FC = () => {
  const {
    serverCount,
    shouldShowOnboarding,
    dismissOnboarding,
    openCreateServerModal,
    showDevelopingToast,
  } = useOutletContext<DmOutletContext>()

  if (serverCount === 0 && shouldShowOnboarding) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-xl rounded-xl border border-border bg-background px-8 py-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
            <MessageCircle className="w-8 h-8 text-foreground" />
          </div>

          <h2 className="text-2xl font-bold text-foreground">Chào mừng đến với {APP_NAME}!</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Nơi để chat, call và kết nối cùng bạn bè và cộng đồng.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={openCreateServerModal}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              Tạo Server
            </button>
            <button
              type="button"
              onClick={showDevelopingToast}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              <Search className="w-4 h-4" />
              Khám phá Server
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>Hoặc</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={dismissOnboarding}
            className="mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <MessagesSquare className="w-4 h-4" />
            Nhắn tin trực tiếp với bạn bè
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
      <MessageCircle className="w-12 h-12 text-muted-foreground" />
      <h2 className="text-xl font-semibold text-foreground">Tin nhắn trực tiếp</h2>
      <p className="text-sm text-muted-foreground">
        Chọn một cuộc trò chuyện hoặc tìm bạn bè để bắt đầu.
      </p>
    </div>
  )
}

const InviteEntryPage: React.FC = () => {
  const { code = '' } = useParams<{ code: string }>()
  const [isHydrated, setIsHydrated] = React.useState(false)
  const [nextPath, setNextPath] = React.useState<string | null>(null)
  const isAuthenticated = useAuthStore((state: any) => state.isAuthenticated)
  const token = useAuthStore((state: any) => state.token)
  const normalizedCode = code.trim()

  React.useEffect(() => {
    let isMounted = true

    const restore = async () => {
      await hydrateSession()
      if (isMounted) {
        setIsHydrated(true)
      }
    }

    void restore()
    return () => {
      isMounted = false
    }
  }, [])

  React.useEffect(() => {
    if (!isHydrated || !normalizedCode) {
      return
    }

    if (!isAuthenticated || !token) {
      localStorage.setItem(POST_AUTH_REDIRECT_KEY, `/invite/${normalizedCode}`)
      setNextPath('/auth/login')
      return
    }

    localStorage.setItem(PENDING_INVITE_CODE_KEY, normalizedCode)
    setNextPath('/app')
  }, [isAuthenticated, isHydrated, normalizedCode, token])

  if (!normalizedCode) {
    return <Navigate to="/app" replace />
  }

  if (!isHydrated) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  if (!nextPath) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  return <Navigate to={nextPath} replace />
}

export const Router: React.FC = () => {
  const handleAuthSuccess = () => {
    const intendedPath = localStorage.getItem(POST_AUTH_REDIRECT_KEY)
    if (intendedPath?.startsWith('/')) {
      localStorage.removeItem(POST_AUTH_REDIRECT_KEY)
      window.location.href = intendedPath
      return
    }
    localStorage.removeItem(POST_AUTH_REDIRECT_KEY)
    window.location.href = '/app'
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes — public */}
        <Route
          path="/auth/*"
          element={
            <AuthLayout>
              <AuthView onAuthenticated={handleAuthSuccess} />
            </AuthLayout>
          }
        />

        <Route path="/invite/:code" element={<InviteEntryPage />} />

        {/* Protected routes */}
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <AppShell />
            </PrivateRoute>
          }
        >
          <Route index element={<AppIndexRedirect />} />
          <Route path="@me" element={<DMHomePage />} />
          <Route path="servers/:serverId/channels/:channelId" element={<DashboardView />} />
          <Route path="servers/:serverId/voice/:channelId" element={<VoiceChannelView />} />
        </Route>

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
