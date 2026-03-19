/**
 * useLogin Hook
 *
 * Mutation hook for login. Saves user and token to auth store on success.
 */

import { useMutation } from '@tanstack/react-query'
import { authRepo } from '@goportal/services'
import type { LoginRequest } from '@goportal/types'
import { useAuthStore } from '@goportal/store'

export const useLogin = () => {
  const setUser = useAuthStore((state: any) => state.setUser)
  const setToken = useAuthStore((state: any) => state.setToken)

  return useMutation({
    mutationFn: (body: LoginRequest) => authRepo.login(body),
    onSuccess: (data) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('auth-token', data.token)
      }
      setToken(data.token)
      setUser(data.user)
    },
  })
}
