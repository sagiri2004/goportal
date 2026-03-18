/**
 * Auth Layout
 *
 * Simple centered card layout for login and register screens.
 * Uses discord-like dark theme with proper design tokens.
 */

import React from 'react'

type AuthLayoutProps = {
  children: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
