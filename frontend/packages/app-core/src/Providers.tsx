/**
 * Root Providers
 *
 * Wraps the entire app with necessary providers:
 * - React Query (TanStack Query)
 * - Zustand store hydration
 * - Error boundary
 */

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

type ProvidersProps = {
  children: React.ReactNode
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
