import {
  BedDouble,
  Beer,
  ClipboardList,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeft,
  ShoppingCart,
  Tag,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useAuth } from '@/shared/auth/AuthContext'
import { cn } from '@/shared/lib/utils'
import { MangoIcon } from '@/shared/ui/MangoIcon'
import { BrandBackdrop } from './BrandBackdrop'

interface Enlace {
  to: string
  label: string
  recurso: string | null
  icon: LucideIcon
}

interface Grupo {
  titulo: string
  enlaces: Enlace[]
}

const GRUPOS: Grupo[] = [
  {
    titulo: 'Operación',
    enlaces: [
      { to: '/', label: 'Vender', recurso: 'VENTAS', icon: ShoppingCart },
      { to: '/resumen', label: 'Resumen', recurso: null, icon: Home },
      { to: '/habitaciones', label: 'Habitaciones', recurso: 'HABITACIONES', icon: BedDouble },
      { to: '/reportes', label: 'Reportes', recurso: 'RESERVAS', icon: ClipboardList },
      { to: '/restaurante/mesas', label: 'Mesas', recurso: 'MESAS', icon: LayoutGrid },
      {
        to: '/productos/restaurante',
        label: 'Restaurante',
        recurso: 'PRODUCTOS_RESTAURANTE',
        icon: UtensilsCrossed,
      },
      { to: '/productos/bar', label: 'Bar', recurso: 'PRODUCTOS_BAR', icon: Beer },
      { to: '/caja', label: 'Caja', recurso: 'CAJA', icon: Wallet },
    ],
  },
  {
    titulo: 'Administración',
    enlaces: [{ to: '/tarifario', label: 'Tarifario', recurso: 'TARIFAS', icon: Tag }],
  },
]

const TITULOS_PAGINA: Record<string, string> = {
  '/': 'Vender',
  '/resumen': 'Resumen',
  '/habitaciones': 'Habitaciones',
  '/reportes': 'Reportes',
  '/restaurante/mesas': 'Mesas',
  '/productos/restaurante': 'Restaurante',
  '/productos/bar': 'Bar',
  '/tarifario': 'Tarifario',
  '/caja': 'Caja',
}

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, logout, tienePermiso } = useAuth()
  const location = useLocation()
  const [colapsado, setColapsado] = useState(false)
  const [abiertoMovil, setAbiertoMovil] = useState(false)

  const inicial =
    usuario?.nombre
      .trim()
      .split(/\s+/)
      .map((palabra) => palabra[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? '--'

  return (
    <div className="flex min-h-dvh">
      <BrandBackdrop />
      {abiertoMovil && (
        <button
          type="button"
          aria-label="Cerrar menu"
          onClick={() => setAbiertoMovil(false)}
          className="fixed inset-0 z-40 bg-marca-950/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r border-border bg-marca-100/80 transition-transform duration-200 lg:static lg:z-0 lg:translate-x-0 lg:transition-[width]',
          colapsado ? 'lg:w-[76px]' : 'lg:w-64',
          abiertoMovil && 'translate-x-0',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-5">
            <MangoIcon size={28} className="shrink-0 text-marca-900" />
            {!colapsado && (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-tight text-marca-900">
                  Hotel Los Mangos
                </p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Gestión
                </p>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {GRUPOS.map((grupo) => {
              const visibles = grupo.enlaces.filter(
                (enlace) => !enlace.recurso || tienePermiso(enlace.recurso, 'VER'),
              )
              if (visibles.length === 0) return null
              return (
                <div key={grupo.titulo}>
                  {!colapsado && (
                    <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {grupo.titulo}
                    </p>
                  )}
                  <ul className="space-y-0.5">
                    {visibles.map((enlace) => {
                      const Icono = enlace.icon
                      return (
                        <li key={enlace.to}>
                          <NavLink
                            to={enlace.to}
                            end={enlace.to === '/'}
                            onClick={() => setAbiertoMovil(false)}
                            title={colapsado ? enlace.label : undefined}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-marca-700 hover:bg-marca-200/70',
                                colapsado && 'justify-center px-0',
                              )
                            }
                          >
                            <Icono size={18} className="shrink-0" />
                            {!colapsado && <span className="truncate">{enlace.label}</span>}
                          </NavLink>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </nav>

          {usuario && (
            <div className="border-t border-border p-3">
              <div
                className={cn(
                  'flex items-center gap-2.5 rounded-lg py-1.5',
                  colapsado && 'justify-center',
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {inicial}
                </div>
                {!colapsado && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-marca-900">
                      {usuario.nombre}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {usuario.roles.join(', ')}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={logout}
                  aria-label="Cerrar sesion"
                  title="Cerrar sesion"
                  className="shrink-0 rounded-md p-1.5 text-marca-500 hover:bg-marca-200/70 hover:text-marca-900"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-marca-50/70 px-4 py-3">
          <button
            type="button"
            onClick={() => setAbiertoMovil(true)}
            aria-label="Abrir menu"
            className="rounded-md p-1.5 text-marca-600 hover:bg-marca-100 lg:hidden"
          >
            <Menu size={18} />
          </button>
          <button
            type="button"
            onClick={() => setColapsado((valor) => !valor)}
            aria-label="Alternar menu"
            className="hidden rounded-md p-1.5 text-marca-600 hover:bg-marca-100 lg:inline-flex"
          >
            <PanelLeft size={18} />
          </button>
          <p className="text-sm font-medium text-muted-foreground">
            {TITULOS_PAGINA[location.pathname] ?? 'Hotel Los Mangos'}
          </p>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
