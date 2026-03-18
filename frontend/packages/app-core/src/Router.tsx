/**
 * App Router
 *
 * Main routing setup for the application:
 * - Public routes: /auth/login, /auth/register
 * - Protected routes: /app/* (all require authentication)
 * - Fallback: redirect to /auth/login
 */

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { PrivateRoute } from './PrivateRoute'
import { AppShell } from './layout/AppShell'
import { AuthView } from '@goportal/feature-auth'
import { DashboardView } from '@goportal/feature-dashboard'

export const Router: React.FC = () => {
  const handleAuthSuccess = () => {
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

        {/* Protected routes */}
        <Route
          path="/app/*"
          element={
            <PrivateRoute>
              <AppShell>
                <DashboardView />
              </AppShell>
            </PrivateRoute>
          }
        />

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
