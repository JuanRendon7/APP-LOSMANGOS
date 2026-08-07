import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { crearMesa } from './api'

const mesaSchema = z.object({
  nombre: z.string().min(1, { error: 'El nombre es requerido' }),
  capacidad: z
    .number({ error: 'Ingresa una capacidad valida' })
    .gt(0, { error: 'La capacidad debe ser mayor a 0' }),
})

type MesaForm = z.infer<typeof mesaSchema>

interface Props {
  onCerrar: () => void
  onCreada: () => void
}

export function MesaFormModal({ onCerrar, onCreada }: Props) {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MesaForm>({
    resolver: zodResolver(mesaSchema),
    defaultValues: { nombre: '', capacidad: 4 },
  })

  const onSubmit = async (datos: MesaForm) => {
    setErrorGeneral(null)
    try {
      await crearMesa(datos)
      onCreada()
    } catch {
      setErrorGeneral('No se pudo crear la mesa.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-card-foreground">Nueva mesa</h3>
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
                  placeholder="Mesa 5"
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
              htmlFor="capacidad"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Capacidad (personas)
            </label>
            <Controller
              name="capacidad"
              control={control}
              render={({ field }) => (
                <input
                  id="capacidad"
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
            {errors.capacidad && (
              <p className="mt-1 text-sm text-destructive">{errors.capacidad.message}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            La mesa se crea en el centro del mapa — arrastrala a su sitio despues.
          </p>

          {errorGeneral && <p className="text-sm text-destructive">{errorGeneral}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Creando...' : 'Crear mesa'}
          </button>
        </form>
      </div>
    </div>
  )
}
