import React from 'react'

type AppShellProps = {
  children: React.ReactNode
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      {children}
    </div>
  )
}
