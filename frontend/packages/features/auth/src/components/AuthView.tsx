/**
 * AuthView Component
 *
 * Main auth view that toggles between login and register forms.
 */

import React, { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

type AuthViewProps = {
  onAuthenticated: () => void
}

type Mode = 'login' | 'register'

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<Mode>('login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md bg-card rounded-lg shadow-2xl px-8 py-10 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">
            {mode === 'login' ? 'Welcome back!' : 'Create an account'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login'
              ? "We're so excited to see you again!"
              : 'Join your friends on GoPortal.'}
          </p>
        </div>

        {mode === 'login' ? (
          <LoginForm
            onSuccess={onAuthenticated}
            onSwitchToRegister={() => setMode('register')}
          />
        ) : (
          <RegisterForm onSuccess={() => setMode('login')} onSwitchToLogin={() => setMode('login')} />
        )}
      </div>
    </div>
  )
}
