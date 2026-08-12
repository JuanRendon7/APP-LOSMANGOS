import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { actualizarTemporada, crearTemporada } from './api'
import type { Temporada } from './types'

const temporadaSchema = z
  .object({
    nombre: z.string().min(1, { error: 'El nombre es requerido' }),
    fecha_inicio: z.string().min(1, { error: 'Selecciona la fecha de inicio' }),
    fecha_fin: z.string().min(1, { error: 'Selecciona la fecha de fin' }),
    precio_noche: z
      .number({ error: 'Ingresa un precio valido' })
      .gt(0, { error: 'El precio debe ser mayor a 0' }),
    activa: z.boolean(),
  })
  .refine((datos) => datos.fecha_inicio <= datos.fecha_fin, {
    error: 'La fecha de fin debe ser igual o posterior a la de inicio',
    path: ['fecha_fin'],
  })

type TemporadaForm = z.infer<typeof temporadaSchema>

interface Props {
  temporadaExistente: Temporada | null
  onCerrar: () => void
  onGuardada: () => void
}

export function TemporadaFormModal({ temporadaExistente, onCerrar, onGuardada }: Props) {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TemporadaForm>({
    resolver: zodResolver(temporadaSchema),
    defaultValues: {
      nombre: temporadaExistente?.nombre ?? '',
      fecha_inicio: temporadaExistente?.fecha_inicio ?? '',
      fecha_fin: temporadaExistente?.fecha_fin ?? '',
      precio_noche: temporadaExistente?.precio_noche ?? 0,
      activa: temporadaExistente?.activa ?? true,
    },
  })

  const onSubmit = async (datos: TemporadaForm) => {
    setErrorGeneral(null)
    try {
      if (temporadaExistente) {
        await actualizarTemporada(temporadaExistente.id_temporada, datos)
      } else {
        await crearTemporada(datos)
      }
      onGuardada()
    } catch {
      setErrorGeneral(
        'No se pudo guardar la temporada. Verifica que las fechas no se solapen con otra activa.',
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-card-foreground">
            {temporadaExistente ? 'Editar temporada' : 'Nueva temporada'}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="fecha_inicio"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Desde
              </label>
              <Controller
                name="fecha_inicio"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    id="fecha_inicio"
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              />
              {errors.fecha_inicio && (
                <p className="mt-1 text-sm text-destructive">{errors.fecha_inicio.message}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="fecha_fin"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Hasta
              </label>
              <Controller
                name="fecha_fin"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    id="fecha_fin"
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              />
              {errors.fecha_fin && (
                <p className="mt-1 text-sm text-destructive">{errors.fecha_fin.message}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="precio_noche"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Precio por noche (COP)
            </label>
            <Controller
              name="precio_noche"
              control={control}
              render={({ field }) => (
                <input
                  id="precio_noche"
                  type="number"
                  min={0}
                  step={1}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
            {errors.precio_noche && (
              <p className="mt-1 text-sm text-destructive">{errors.precio_noche.message}</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Controller
              name="activa"
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
            Activa
          </label>

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
