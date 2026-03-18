/**
 * RegisterForm Component
 *
 * Form to register a new account with username and password.
 * Validates input, shows field errors, and handles API errors.
 */

import React, { useState } from 'react'
import { Button, Input, Label } from '@goportal/ui'
import { useRegister } from '../hooks/useRegister'
import { cn } from '@goportal/ui'
import type { RegisterRequest } from '@goportal/types'
import { AUTH_ERROR_CODES } from '@goportal/types'

type RegisterFormProps = {
  onSuccess: () => void
  onSwitchToLogin: () => void
}

type FieldErrors = Partial<Record<keyof RegisterRequest, string>>

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [form, setForm] = useState<RegisterRequest>({ username: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const register = useRegister()

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

    register.mutate(
      { username: form.username.trim(), password: form.password },
      {
        onSuccess: () => {
          // Clear form and switch to login
          setForm({ username: '', password: '' })
          setFieldErrors({})
          onSuccess()
        },
        onError: (err: any) => {
          const code = err?.response?.data?.code
          if (code === AUTH_ERROR_CODES.USERNAME_EXISTS) {
            setFieldErrors({ username: 'This username is already taken' })
          } else {
            setFieldErrors({ username: 'An error occurred. Please try again.' })
          }
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reg-username" className="text-xs font-semibold uppercase tracking-wide">
          Username
        </Label>
        <Input
          id="reg-username"
          value={form.username}
          onChange={(e) => {
            setForm((f) => ({ ...f, username: e.target.value }))
            setFieldErrors((e) => ({ ...e, username: undefined }))
          }}
          placeholder="Choose a username"
          autoComplete="username"
          disabled={register.isPending}
          className={cn(fieldErrors.username && 'border-danger focus-visible:ring-danger')}
        />
        {fieldErrors.username && <p className="text-xs text-danger">{fieldErrors.username}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password" className="text-xs font-semibold uppercase tracking-wide">
          Password
        </Label>
        <Input
          id="reg-password"
          type="password"
          value={form.password}
          onChange={(e) => {
            setForm((f) => ({ ...f, password: e.target.value }))
            setFieldErrors((e) => ({ ...e, password: undefined }))
          }}
          placeholder="Create a password"
          autoComplete="new-password"
          disabled={register.isPending}
          className={cn(fieldErrors.password && 'border-danger focus-visible:ring-danger')}
        />
        {fieldErrors.password && <p className="text-xs text-danger">{fieldErrors.password}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={register.isPending}>
        {register.isPending ? 'Creating account...' : 'Create Account'}
      </Button>

      <p className="text-xs text-muted text-center">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-primary hover:underline font-medium"
        >
          Log In
        </button>
      </p>
    </form>
  )
}
