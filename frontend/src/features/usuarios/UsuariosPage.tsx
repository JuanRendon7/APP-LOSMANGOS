import { Ban, CircleCheck, Pencil } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/shared/auth/AuthContext'
import { IconActionButton } from '@/shared/ui/IconActionButton'
import { actualizarUsuario, listarUsuarios } from './api'
import { UsuarioFormModal } from './UsuarioFormModal'
import type { Usuario } from './types'

const ETIQUETA_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  EMPLEADO: 'Empleado',
}

export function UsuariosPage() {
  const { usuario: usuarioActual, tienePermiso } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const puedeCrear = tienePermiso('USUARIOS', 'CREAR')
  const puedeEditar = tienePermiso('USUARIOS', 'EDITAR')

  const recargar = useCallback(async () => {
    try {
      const datos = await listarUsuarios()
      setUsuarios(datos)
      setError(null)
    } catch {
      setError('No se pudieron cargar los usuarios.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const manejarToggleActivo = async (usuario: Usuario) => {
    setError(null)
    try {
      await actualizarUsuario(usuario.id_usuario, { activo: !usuario.activo })
      await recargar()
    } catch {
      setError('No se pudo cambiar el estado del usuario.')
    }
  }

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Crea y administra las cuentas del equipo (rol Administrador o Empleado).
          </p>
        </div>
        {puedeCrear && (
          <button
            onClick={() => {
              setEditando(null)
              setMostrarForm(true)
            }}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Nuevo usuario
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-mango-700 text-left text-xs uppercase text-mango-50">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Cedula</th>
              <th className="px-3 py-2">Celular</th>
              <th className="px-3 py-2">Correo</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Estado</th>
              {puedeEditar && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const esUsuarioActual = u.id_usuario === usuarioActual?.id_usuario
              return (
                <tr key={u.id_usuario} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">
                    {u.nombre}
                    {esUsuarioActual && (
                      <span className="ml-1 text-xs text-muted-foreground">(tu)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{u.cedula}</td>
                  <td className="px-3 py-2 text-muted-foreground">{u.celular}</td>
                  <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-3 py-2 text-foreground">
                    {u.roles.map((r) => ETIQUETA_ROL[r] ?? r).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </td>
                  {puedeEditar && (
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <IconActionButton
                          icono={Pencil}
                          etiqueta="Editar"
                          onClick={() => {
                            setEditando(u)
                            setMostrarForm(true)
                          }}
                        />
                        <IconActionButton
                          icono={u.activo ? Ban : CircleCheck}
                          etiqueta={u.activo ? 'Desactivar' : 'Activar'}
                          tono={u.activo ? 'peligro' : 'exito'}
                          disabled={esUsuarioActual}
                          onClick={() => manejarToggleActivo(u)}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  No hay usuarios creados todavia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {mostrarForm && (
        <UsuarioFormModal
          usuarioExistente={editando}
          esUsuarioActual={editando?.id_usuario === usuarioActual?.id_usuario}
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
