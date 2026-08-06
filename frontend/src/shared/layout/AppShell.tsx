import type { ReactNode } from 'react'
import { useAuth } from '@/shared/auth/AuthContext'

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="font-semibold text-card-foreground">Hotel Los Mangos</span>
          {usuario && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                {usuario.nombre} · {usuario.roles.join(', ')}
              </span>
              <button
                onClick={logout}
                className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-secondary"
              >
                Cerrar sesion
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  )
}
