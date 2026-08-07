import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '@/shared/auth/AuthContext'
import { cn } from '@/shared/lib/utils'

const ENLACES = [
  { to: '/', label: 'Inicio', recurso: null },
  { to: '/habitaciones', label: 'Habitaciones', recurso: 'HABITACIONES' },
  { to: '/tarifario', label: 'Tarifario', recurso: 'TARIFAS' },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, logout, tienePermiso } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-card-foreground">Hotel Los Mangos</span>
            <nav className="flex items-center gap-4">
              {ENLACES.filter((enlace) => !enlace.recurso || tienePermiso(enlace.recurso, 'VER')).map(
                (enlace) => (
                  <NavLink
                    key={enlace.to}
                    to={enlace.to}
                    end={enlace.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'text-sm font-medium text-muted-foreground hover:text-foreground',
                        isActive && 'text-foreground',
                      )
                    }
                  >
                    {enlace.label}
                  </NavLink>
                ),
              )}
            </nav>
          </div>
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
