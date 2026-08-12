import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { actualizarProveedor, crearProveedor } from './api'
import type { Proveedor } from './types'

const proveedorSchema = z.object({
  nombre: z.string().min(1, { error: 'El nombre es requerido' }),
  nit_cedula: z.string(),
  contacto: z.string(),
  categoria: z.string(),
  notas: z.string(),
  activo: z.boolean(),
})

type ProveedorForm = z.infer<typeof proveedorSchema>

interface Props {
  proveedorExistente: Proveedor | null
  onCerrar: () => void
  onGuardado: () => void
}

export function ProveedorFormModal({ proveedorExistente, onCerrar, onGuardado }: Props) {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const esEdicion = proveedorExistente !== null

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProveedorForm>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: {
      nombre: proveedorExistente?.nombre ?? '',
      nit_cedula: proveedorExistente?.nit_cedula ?? '',
      contacto: proveedorExistente?.contacto ?? '',
      categoria: proveedorExistente?.categoria ?? '',
      notas: proveedorExistente?.notas ?? '',
      activo: proveedorExistente?.activo ?? true,
    },
  })

  const onSubmit = async (datos: ProveedorForm) => {
    setErrorGeneral(null)
    const payload = {
      nombre: datos.nombre,
      nit_cedula: datos.nit_cedula.trim() || undefined,
      contacto: datos.contacto.trim() || undefined,
      categoria: datos.categoria.trim() || undefined,
      notas: datos.notas.trim() || undefined,
      activo: datos.activo,
    }
    try {
      if (proveedorExistente) {
        await actualizarProveedor(proveedorExistente.id_proveedor, payload)
      } else {
        await crearProveedor(payload)
      }
      onGuardado()
    } catch {
      setErrorGeneral(
        'No se pudo guardar el proveedor. Verifica que el NIT/cedula no este repetido.',
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-card-foreground">
            {proveedorExistente ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h3>
          <button onClick={onCerrar} className="text-xs text-muted-foreground hover:underline">
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-foreground">
              Nombre
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

          <div>
            <label
              htmlFor="nit_cedula"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              NIT / cedula <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <Controller
              name="nit_cedula"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="nit_cedula"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
          </div>

          <div>
            <label
              htmlFor="contacto"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Contacto <span className="font-normal text-muted-foreground">(telefono/email)</span>
            </label>
            <Controller
              name="contacto"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="contacto"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
          </div>

          <div>
            <label
              htmlFor="categoria"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Categoria <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <Controller
              name="categoria"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="categoria"
                  placeholder="Ej: Insumos bar, Mantenimiento, Lavanderia"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
          </div>

          <div>
            <label htmlFor="notas" className="mb-1 block text-sm font-medium text-foreground">
              Notas <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <Controller
              name="notas"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="notas"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
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
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                )}
              />
              Activo
            </label>
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
