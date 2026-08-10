import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { PasswordInput } from '@/shared/ui/PasswordInput'
import { actualizarUsuario, crearUsuario } from './api'
import type { CodigoRol, Usuario } from './types'

const usuarioSchema = z.object({
  nombre: z.string().min(1, { error: 'El nombre es requerido' }),
  cedula: z.string().min(1, { error: 'La cedula es requerida' }),
  celular: z.string().min(1, { error: 'El celular es requerido' }),
  email: z.string().email({ error: 'Ingresa un correo valido' }),
  password: z.union([z.string().min(8, { error: 'Minimo 8 caracteres' }), z.literal('')]),
  rol: z.enum(['ADMINISTRADOR', 'EMPLEADO']),
  activo: z.boolean(),
})

type UsuarioForm = z.infer<typeof usuarioSchema>

const ETIQUETA_ROL: Record<CodigoRol, string> = {
  ADMINISTRADOR: 'Administrador (ve todo)',
  EMPLEADO: 'Empleado (acceso restringido)',
}

interface Props {
  usuarioExistente: Usuario | null
  esUsuarioActual: boolean
  onCerrar: () => void
  onGuardado: () => void
}

export function UsuarioFormModal({
  usuarioExistente,
  esUsuarioActual,
  onCerrar,
  onGuardado,
}: Props) {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const esEdicion = usuarioExistente !== null

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioForm>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nombre: usuarioExistente?.nombre ?? '',
      cedula: usuarioExistente?.cedula ?? '',
      celular: usuarioExistente?.celular ?? '',
      email: usuarioExistente?.email ?? '',
      password: '',
      rol: (usuarioExistente?.roles[0] as CodigoRol) ?? 'EMPLEADO',
      activo: usuarioExistente?.activo ?? true,
    },
  })

  const onSubmit = async (datos: UsuarioForm) => {
    setErrorGeneral(null)
    if (!esEdicion && !datos.password) {
      setErrorGeneral('La clave de acceso es requerida para un usuario nuevo.')
      return
    }
    try {
      if (usuarioExistente) {
        await actualizarUsuario(usuarioExistente.id_usuario, {
          nombre: datos.nombre,
          cedula: datos.cedula,
          celular: datos.celular,
          activo: esUsuarioActual ? undefined : datos.activo,
          roles: esUsuarioActual ? undefined : [datos.rol],
          password: datos.password || undefined,
        })
      } else {
        await crearUsuario({
          nombre: datos.nombre,
          cedula: datos.cedula,
          celular: datos.celular,
          email: datos.email,
          password: datos.password,
          roles: [datos.rol],
        })
      }
      onGuardado()
    } catch {
      setErrorGeneral(
        'No se pudo guardar el usuario. Verifica que el correo y la cedula no esten repetidos.',
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-card-foreground">
            {esEdicion ? 'Editar usuario' : 'Nuevo usuario'}
          </h3>
          <button onClick={onCerrar} className="text-xs text-muted-foreground hover:underline">
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-foreground">
              Nombre completo
            </label>
            <Controller
              name="nombre"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="nombre"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cedula" className="mb-1 block text-sm font-medium text-foreground">
                Cedula
              </label>
              <Controller
                name="cedula"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    id="cedula"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              />
              {errors.cedula && (
                <p className="mt-1 text-sm text-destructive">{errors.cedula.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="celular" className="mb-1 block text-sm font-medium text-foreground">
                Celular
              </label>
              <Controller
                name="celular"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    id="celular"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              />
              {errors.celular && (
                <p className="mt-1 text-sm text-destructive">{errors.celular.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
              Correo
            </label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="email"
                  type="email"
                  disabled={esEdicion}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
              )}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
              Clave de acceso{esEdicion && ' (dejar en blanco para no cambiarla)'}
            </label>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <PasswordInput {...field} id="password" autoComplete="new-password" />
              )}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="rol" className="mb-1 block text-sm font-medium text-foreground">
              Rol
            </label>
            <Controller
              name="rol"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="rol"
                  disabled={esUsuarioActual}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  {(Object.keys(ETIQUETA_ROL) as CodigoRol[]).map((codigo) => (
                    <option key={codigo} value={codigo}>
                      {ETIQUETA_ROL[codigo]}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          {esEdicion && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Controller
                name="activo"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value}
                    disabled={esUsuarioActual}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-input disabled:opacity-60"
                  />
                )}
              />
              Activo
            </label>
          )}

          {esUsuarioActual && (
            <p className="text-xs text-muted-foreground">
              No puedes cambiar tu propio rol ni desactivar tu propia cuenta.
            </p>
          )}

          {errorGeneral && <p className="text-sm text-destructive">{errorGeneral}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  )
}
