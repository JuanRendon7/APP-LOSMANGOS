import { Ban, CircleCheck, CircleSlash, Pencil, Search, Truck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/shared/auth/AuthContext'
import { ESTILO_TONO } from '@/shared/ui/estado'
import { IconActionButton } from '@/shared/ui/IconActionButton'
import { actualizarProveedor, listarProveedores } from './api'
import { ProveedorFormModal } from './ProveedorFormModal'
import type { Proveedor } from './types'

export function ProveedoresPage() {
  const { tienePermiso } = useAuth()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [soloActivos, setSoloActivos] = useState(false)

  const puedeGestionar = tienePermiso('PROVEEDORES', 'CREAR')

  const recargar = useCallback(async () => {
    try {
      const datos = await listarProveedores()
      setProveedores(datos)
      setError(null)
    } catch {
      setError('No se pudieron cargar los proveedores.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const manejarToggleActivo = async (proveedor: Proveedor) => {
    setError(null)
    try {
      await actualizarProveedor(proveedor.id_proveedor, { activo: !proveedor.activo })
      await recargar()
    } catch {
      setError('No se pudo cambiar el estado del proveedor.')
    }
  }

  const activos = proveedores.filter((p) => p.activo)

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return proveedores
      .filter((p) => !soloActivos || p.activo)
      .filter(
        (p) =>
          !texto ||
          p.nombre.toLowerCase().includes(texto) ||
          p.nit_cedula?.toLowerCase().includes(texto) ||
          p.categoria?.toLowerCase().includes(texto),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [proveedores, busqueda, soloActivos])

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando proveedores...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            Proveedores
          </h1>
          <p className="text-sm text-muted-foreground">
            Directorio de proveedores del hotel para llevar los gastos.
          </p>
        </div>
        {puedeGestionar && (
          <button
            onClick={() => {
              setEditando(null)
              setMostrarForm(true)
            }}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Nuevo proveedor
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Truck size={14} /> Total · {proveedores.length}
        </span>
        <button
          onClick={() => setSoloActivos((valor) => !valor)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            soloActivos
              ? ESTILO_TONO.exito.chipActivo
              : 'border-border text-muted-foreground hover:bg-secondary'
          }`}
        >
          <CircleCheck size={14} /> Activos · {activos.length}
        </button>
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <CircleSlash size={14} /> Inactivos · {proveedores.length - activos.length}
        </span>
      </div>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, NIT o categoria..."
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-mango-700 text-left text-xs uppercase text-mango-50">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">NIT / cedula</th>
              <th className="px-3 py-2">Contacto</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Estado</th>
              {puedeGestionar && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {visibles.map((proveedor) => (
              <tr
                key={proveedor.id_proveedor}
                className="border-t border-border hover:bg-secondary/40"
              >
                <td className="px-3 py-2 text-foreground">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                      <Truck size={14} />
                    </div>
                    <span className={proveedor.activo ? '' : 'text-muted-foreground'}>
                      {proveedor.nombre}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {proveedor.nit_cedula ?? '—'}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {proveedor.contacto ?? '—'}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {proveedor.categoria ?? '—'}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      proveedor.activo
                        ? ESTILO_TONO.exito.badge
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {proveedor.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {puedeGestionar && (
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <IconActionButton
                        icono={Pencil}
                        etiqueta="Editar"
                        onClick={() => {
                          setEditando(proveedor)
                          setMostrarForm(true)
                        }}
                      />
                      <IconActionButton
                        icono={proveedor.activo ? Ban : CircleCheck}
                        etiqueta={proveedor.activo ? 'Desactivar' : 'Activar'}
                        tono={proveedor.activo ? 'peligro' : 'exito'}
                        onClick={() => manejarToggleActivo(proveedor)}
                      />
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td
                  colSpan={puedeGestionar ? 6 : 5}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  {proveedores.length === 0
                    ? 'No hay proveedores creados todavia.'
                    : 'Ningun proveedor coincide con la busqueda.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {mostrarForm && (
        <ProveedorFormModal
          proveedorExistente={editando}
          onCerrar={() => setMostrarForm(false)}
          onGuardado={() => {
            setMostrarForm(false)
            recargar()
          }}
        />
      )}
    </div>
  )
}
