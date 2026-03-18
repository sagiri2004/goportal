/**
 * useRegister Hook
 *
 * Mutation hook for registration.
 */

import { useMutation } from '@tanstack/react-query'
import { authRepo } from '@goportal/services'
import type { RegisterRequest } from '@goportal/types'

export const useRegister = () =>
  useMutation({
    mutationFn: (body: RegisterRequest) => authRepo.register(body),
  })
