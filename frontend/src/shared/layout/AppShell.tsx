import {
  Banknote,
  BedDouble,
  Beer,
  Bell,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeft,
  ShoppingCart,
  Tag,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useAuth } from '@/shared/auth/AuthContext'
import { cn } from '@/shared/lib/utils'
import { NotificationBell } from '@/shared/notifications/NotificationBell'
import { GlobalSearch } from '@/shared/search/GlobalSearch'
import { MangoIcon } from '@/shared/ui/MangoIcon'
import { BrandBackdrop } from './BrandBackdrop'

interface Enlace {
  to: string
  label: string
  recurso: string | null
  icon: LucideIcon
}

interface Subgrupo {
  titulo: string
  enlaces: Enlace[]
}

interface Grupo {
  titulo: string
  enlaces: Enlace[]
  subgrupo?: Subgrupo
}

const GRUPOS: Grupo[] = [
  {
    titulo: 'Operación',
    enlaces: [
      { to: '/', label: 'Vender', recurso: 'VENTAS', icon: ShoppingCart },
      { to: '/habitaciones', label: 'Habitaciones', recurso: 'HABITACIONES', icon: BedDouble },
      { to: '/restaurante/mesas', label: 'Mesas', recurso: 'MESAS', icon: LayoutGrid },
      { to: '/caja', label: 'Caja', recurso: 'CAJA', icon: Wallet },
    ],
  },
  {
    titulo: 'Administración',
    enlaces: [
      { to: '/reportes', label: 'Reportes', recurso: 'REPORTES', icon: ClipboardList },
      { to: '/usuarios', label: 'Usuarios', recurso: 'USUARIOS', icon: Users },
      { to: '/liquidaciones', label: 'Liquidacion empleados', recurso: 'LIQUIDACIONES', icon: Banknote },
    ],
    subgrupo: {
      titulo: 'Maestros',
      enlaces: [
        {
          to: '/productos/restaurante',
          label: 'Productos restaurante',
          recurso: 'PRODUCTOS_RESTAURANTE',
          icon: UtensilsCrossed,
        },
        {
          to: '/productos/bar',
          label: 'Productos Bar',
          recurso: 'PRODUCTOS_BAR',
          icon: Beer,
        },
        { to: '/tarifario', label: 'Tarifa Hotel', recurso: 'TARIFAS', icon: Tag },
        {
          to: '/habitaciones/catalogo',
          label: 'Habitaciones',
          recurso: 'HABITACIONES',
          icon: BedDouble,
        },
        { to: '/configuracion', label: 'Notificaciones', recurso: 'CONFIGURACION', icon: Bell },
      ],
    },
  },
]

const RUTAS_MAESTROS = GRUPOS.flatMap((grupo) => grupo.subgrupo?.enlaces.map((e) => e.to) ?? [])

const TITULOS_PAGINA: Record<string, string> = {
  '/': 'Vender',
  '/habitaciones': 'Habitaciones',
  '/reportes': 'Reportes',
  '/restaurante/mesas': 'Mesas',
  '/productos/restaurante': 'Productos restaurante',
  '/productos/bar': 'Productos Bar',
  '/tarifario': 'Tarifa Hotel',
  '/caja': 'Caja',
  '/usuarios': 'Usuarios',
  '/liquidaciones': 'Liquidacion empleados',
  '/configuracion': 'Notificaciones',
  '/habitaciones/catalogo': 'Habitaciones',
}

function ItemEnlace({
  enlace,
  colapsado,
  indentado,
  onClick,
}: {
  enlace: Enlace
  colapsado: boolean
  indentado?: boolean
  onClick: () => void
}) {
  const Icono = enlace.icon
  return (
    <li>
      <NavLink
        to={enlace.to}
        end={enlace.to === '/'}
        onClick={onClick}
        title={colapsado ? enlace.label : undefined}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
            isActive ? 'bg-mango-700 text-mango-50' : 'text-marca-700 hover:bg-marca-200/70',
            colapsado && 'justify-center px-0',
          )
        }
      >
        <Icono size={18} className="shrink-0" />
        {!colapsado && (
          <span className={indentado ? 'leading-tight' : 'truncate'}>{enlace.label}</span>
        )}
      </NavLink>
    </li>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, logout, tienePermiso } = useAuth()
  const location = useLocation()
  const [colapsado, setColapsado] = useState(false)
  const [abiertoMovil, setAbiertoMovil] = useState(false)
  const [maestrosAbierto, setMaestrosAbierto] = useState(() =>
    RUTAS_MAESTROS.includes(location.pathname),
  )

  useEffect(() => {
    if (RUTAS_MAESTROS.includes(location.pathname)) {
      setMaestrosAbierto(true)
    }
  }, [location.pathname])

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
      <BrandBackdrop opacidadImagen={0.18} opacidadVelo={0.65} desenfoquePx={0} />
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
          'fixed inset-y-0 left-0 z-50 flex w-56 -translate-x-full flex-col border-r border-border bg-marca-100/80 transition-transform duration-200 lg:static lg:z-0 lg:translate-x-0 lg:transition-[width]',
          colapsado ? 'lg:w-[76px]' : 'lg:w-56',
          abiertoMovil && 'translate-x-0',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2.5 border-b border-oro-400/40 px-4 py-5">
            <MangoIcon size={28} className="shrink-0 text-marca-900" />
            {!colapsado && (
              <div className="min-w-0">
                <p className="truncate font-serif text-xl font-bold tracking-tight text-marca-900">
                  Hotel Los Mangos
                </p>
                <p className="truncate text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Gestión Hotel &amp; Restaurante
                </p>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {GRUPOS.map((grupo) => {
              const visibles = grupo.enlaces.filter(
                (enlace) => !enlace.recurso || tienePermiso(enlace.recurso, 'VER'),
              )
              const visiblesSubgrupo =
                grupo.subgrupo?.enlaces.filter(
                  (enlace) => !enlace.recurso || tienePermiso(enlace.recurso, 'VER'),
                ) ?? []
              if (visibles.length === 0 && visiblesSubgrupo.length === 0) return null
              return (
                <div key={grupo.titulo}>
                  {!colapsado && (
                    <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      {grupo.titulo}
                    </p>
                  )}
                  <ul className="space-y-0.5">
                    {visibles.map((enlace) => (
                      <ItemEnlace
                        key={enlace.to}
                        enlace={enlace}
                        colapsado={colapsado}
                        onClick={() => setAbiertoMovil(false)}
                      />
                    ))}
                  </ul>
                  {visiblesSubgrupo.length > 0 &&
                    (colapsado ? (
                      <ul className="space-y-0.5">
                        {visiblesSubgrupo.map((enlace) => (
                          <ItemEnlace
                            key={enlace.to}
                            enlace={enlace}
                            colapsado={colapsado}
                            onClick={() => setAbiertoMovil(false)}
                          />
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-0.5">
                        <button
                          type="button"
                          onClick={() => setMaestrosAbierto((v) => !v)}
                          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-marca-700 hover:bg-marca-200/70"
                        >
                          <ChevronRight
                            size={14}
                            className={cn(
                              'shrink-0 transition-transform',
                              maestrosAbierto && 'rotate-90',
                            )}
                          />
                          <span className="truncate">{grupo.subgrupo?.titulo}</span>
                        </button>
                        {maestrosAbierto && (
                          <ul className="mt-0.5 ml-2.5 space-y-0.5 border-l border-border pl-2">
                            {visiblesSubgrupo.map((enlace) => (
                              <ItemEnlace
                                key={enlace.to}
                                enlace={enlace}
                                colapsado={colapsado}
                                indentado
                                onClick={() => setAbiertoMovil(false)}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
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
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-oro-400/40 bg-marca-50/70 px-4 py-3">
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
          <p className="min-w-0 flex-1 truncate font-serif text-lg font-semibold tracking-tight text-foreground sm:flex-none">
            {TITULOS_PAGINA[location.pathname] ?? 'Hotel Los Mangos'}
          </p>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <GlobalSearch />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
