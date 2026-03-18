/**
 * Auth Store
 *
 * Manages:
 * - Current user data and token
 * - Authentication state (isAuthenticated, isLoading)
 * - Auth errors
 *
 * Persists to localStorage via Zustand persist middleware
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, AuthErrorCode } from '@goportal/types'

type AuthState = {
  // State
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthErrorCode | null

  // Actions
  setToken: (token: string | null) => void
  setUser: (user: AuthUser | null) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: AuthErrorCode | null) => void
  clearError: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setToken: (token) =>
        set({
          token,
          isAuthenticated: !!token,
        }),

      setUser: (user) =>
        set({
          user,
        }),

      setIsLoading: (loading) =>
        set({
          isLoading: loading,
        }),

      setError: (error) =>
        set({
          error,
        }),

      clearError: () =>
        set({
          error: null,
        }),

      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
