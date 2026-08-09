import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { actualizarHabitacionInfo, crearHabitacion } from './api'
import type { Habitacion } from './types'

const habitacionSchema = z.object({
  numero: z.string().min(1, { error: 'El numero es requerido' }).max(10),
  piso: z.number({ error: 'Ingresa un piso valido' }).int().min(1, { error: 'El piso debe ser 1 o mayor' }),
  tipo: z.string().min(1, { error: 'El tipo es requerido' }).max(50),
})

type HabitacionForm = z.infer<typeof habitacionSchema>

interface Props {
  habitacionExistente: Habitacion | null
  tiposExistentes: string[]
  onCerrar: () => void
  onGuardada: () => void
}

export function HabitacionFormModal({
  habitacionExistente,
  tiposExistentes,
  onCerrar,
  onGuardada,
}: Props) {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HabitacionForm>({
    resolver: zodResolver(habitacionSchema),
    defaultValues: {
      numero: habitacionExistente?.numero ?? '',
      piso: habitacionExistente?.piso ?? 1,
      tipo: habitacionExistente?.tipo ?? '',
    },
  })

  const onSubmit = async (datos: HabitacionForm) => {
    setErrorGeneral(null)
    try {
      if (habitacionExistente) {
        await actualizarHabitacionInfo(habitacionExistente.id_habitacion, datos)
      } else {
        await crearHabitacion(datos)
      }
      onGuardada()
    } catch {
      setErrorGeneral(
        'No se pudo guardar la habitacion. Verifica que el numero no este repetido.',
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-card-foreground">
            {habitacionExistente ? 'Editar habitacion' : 'Nueva habitacion'}
          </h3>
          <button onClick={onCerrar} className="text-xs text-muted-foreground hover:underline">
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="numero" className="mb-1 block text-sm font-medium text-foreground">
                Numero
              </label>
              <Controller
                name="numero"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    id="numero"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              />
              {errors.numero && (
                <p className="mt-1 text-sm text-destructive">{errors.numero.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="piso" className="mb-1 block text-sm font-medium text-foreground">
                Piso
              </label>
              <Controller
                name="piso"
                control={control}
                render={({ field }) => (
                  <input
                    id="piso"
                    type="number"
                    min={1}
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
              {errors.piso && (
                <p className="mt-1 text-sm text-destructive">{errors.piso.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="tipo" className="mb-1 block text-sm font-medium text-foreground">
              Tipo
            </label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="tipo"
                  list="tipos-habitacion-existentes"
                  placeholder="Ej. Sencilla, Dos camas, Pareja..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
            <datalist id="tipos-habitacion-existentes">
              {tiposExistentes.map((tipo) => (
                <option key={tipo} value={tipo} />
              ))}
            </datalist>
            {errors.tipo && (
              <p className="mt-1 text-sm text-destructive">{errors.tipo.message}</p>
            )}
          </div>

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
