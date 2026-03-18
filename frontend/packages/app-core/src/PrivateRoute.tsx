/**
 * Private Route
 *
 * Route guard that redirects unauthenticated users to login.
 * Uses Zustand auth store to check token and user state.
 */

import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
// @ts-ignore: external package '@goportal/store' has no local type declarations
import { useAuthStore } from '@goportal/store'

type PrivateRouteProps = {
  children: React.ReactNode
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false)
  const isAuthenticated = useAuthStore((state: any) => state.isAuthenticated)
  const token = useAuthStore((state: any) => state.token)

  useEffect(() => {
    // Zustand's persist middleware hydrates on mount
    setIsHydrated(true)
  }, [])

  // Wait for hydration before checking auth
  if (!isHydrated) {
    return <div className="h-screen bg-background" />
  }

  if (!isAuthenticated || !token) {
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}
