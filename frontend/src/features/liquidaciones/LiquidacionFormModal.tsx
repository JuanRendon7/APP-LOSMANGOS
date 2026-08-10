import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { crearLiquidacion, actualizarLiquidacion } from './api'
import type { Liquidacion } from './types'

function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const liquidacionSchema = z.object({
  nombre_empleado: z.string().min(1, { error: 'Escribe el nombre del empleado' }),
  periodo: z.string().min(1, { error: 'Describe el periodo que cubre el pago' }),
  monto: z.number({ error: 'Ingresa un monto valido' }).gt(0, { error: 'El monto debe ser mayor a 0' }),
  concepto: z.string().optional(),
  fecha_pago: z.string().min(1, { error: 'Selecciona la fecha de pago' }),
})

type LiquidacionForm = z.infer<typeof liquidacionSchema>

interface Props {
  liquidacionExistente: Liquidacion | null
  onCerrar: () => void
  onGuardada: () => void
}

export function LiquidacionFormModal({ liquidacionExistente, onCerrar, onGuardada }: Props) {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const esEdicion = liquidacionExistente !== null

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LiquidacionForm>({
    resolver: zodResolver(liquidacionSchema),
    defaultValues: {
      nombre_empleado: liquidacionExistente?.nombre_empleado ?? '',
      periodo: liquidacionExistente?.periodo ?? '',
      monto: liquidacionExistente?.monto ?? 0,
      concepto: liquidacionExistente?.concepto ?? '',
      fecha_pago: liquidacionExistente?.fecha_pago ?? hoyISO(),
    },
  })

  const onSubmit = async (datos: LiquidacionForm) => {
    setErrorGeneral(null)
    try {
      const payload = {
        nombre_empleado: datos.nombre_empleado,
        periodo: datos.periodo,
        monto: datos.monto,
        concepto: datos.concepto || null,
        fecha_pago: datos.fecha_pago,
      }
      if (liquidacionExistente) {
        await actualizarLiquidacion(liquidacionExistente.id_liquidacion, payload)
      } else {
        await crearLiquidacion(payload)
      }
      onGuardada()
    } catch {
      setErrorGeneral('No se pudo guardar la liquidacion.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-card-foreground">
            {esEdicion ? 'Editar liquidacion' : 'Nueva liquidacion'}
          </h3>
          <button onClick={onCerrar} className="text-xs text-muted-foreground hover:underline">
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label htmlFor="nombre_empleado" className="mb-1 block text-sm font-medium text-foreground">
              Empleado
            </label>
            <Controller
              name="nombre_empleado"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="nombre_empleado"
                  placeholder="Nombre del empleado"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
            {errors.nombre_empleado && (
              <p className="mt-1 text-sm text-destructive">{errors.nombre_empleado.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="periodo" className="mb-1 block text-sm font-medium text-foreground">
              Periodo que cubre el pago
            </label>
            <Controller
              name="periodo"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="periodo"
                  placeholder="Ej: Marzo 2026, o 1 al 15 de marzo"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
            {errors.periodo && (
              <p className="mt-1 text-sm text-destructive">{errors.periodo.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="monto" className="mb-1 block text-sm font-medium text-foreground">
              Monto pagado (COP)
            </label>
            <Controller
              name="monto"
              control={control}
              render={({ field }) => (
                <input
                  id="monto"
                  type="number"
                  min={0}
                  step={1000}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
            {errors.monto && <p className="mt-1 text-sm text-destructive">{errors.monto.message}</p>}
          </div>

          <div>
            <label htmlFor="fecha_pago" className="mb-1 block text-sm font-medium text-foreground">
              Fecha de pago
            </label>
            <Controller
              name="fecha_pago"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="fecha_pago"
                  type="date"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
            {errors.fecha_pago && (
              <p className="mt-1 text-sm text-destructive">{errors.fecha_pago.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="concepto" className="mb-1 block text-sm font-medium text-foreground">
              Concepto (opcional)
            </label>
            <Controller
              name="concepto"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="concepto"
                  placeholder="Salario, bono, prestaciones..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
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
