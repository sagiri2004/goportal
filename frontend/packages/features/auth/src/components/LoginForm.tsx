/**
 * LoginForm Component
 *
 * Form to log in with username and password.
 * Validates input, shows field errors, and handles API errors.
 */

import React, { useState } from 'react'
import { Button, Input, Label } from '@goportal/ui'
import { useLogin } from '../hooks/useLogin'
import { cn } from '@goportal/ui'
import type { LoginRequest } from '@goportal/types'
import { AUTH_ERROR_CODES } from '@goportal/types'

type LoginFormProps = {
  onSuccess: () => void
  onSwitchToRegister: () => void
}

type FieldErrors = Partial<Record<keyof LoginRequest, string>>

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [form, setForm] = useState<LoginRequest>({ username: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const login = useLogin()

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}
    if (form.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters'
    }
    if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    return errors
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }

    login.mutate(
      { username: form.username.trim(), password: form.password },
      {
        onSuccess,
        onError: (err: any) => {
          const code = err?.response?.data?.code
          if (code === AUTH_ERROR_CODES.BAD_CREDENTIALS) {
            setFieldErrors({ password: 'Invalid username or password' })
          } else {
            setFieldErrors({ password: 'An error occurred. Please try again.' })
          }
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wide">
          Username
        </Label>
        <Input
          id="username"
          value={form.username}
          onChange={(e) => {
            setForm((f) => ({ ...f, username: e.target.value }))
            setFieldErrors((e) => ({ ...e, username: undefined }))
          }}
          placeholder="Enter your username"
          autoComplete="username"
          disabled={login.isPending}
          className={cn(fieldErrors.username && 'border-danger focus-visible:ring-danger')}
        />
        {fieldErrors.username && <p className="text-xs text-danger">{fieldErrors.username}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => {
            setForm((f) => ({ ...f, password: e.target.value }))
            setFieldErrors((e) => ({ ...e, password: undefined }))
          }}
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={login.isPending}
          className={cn(fieldErrors.password && 'border-danger focus-visible:ring-danger')}
        />
        {fieldErrors.password && <p className="text-xs text-danger">{fieldErrors.password}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? 'Logging in...' : 'Log In'}
      </Button>

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
