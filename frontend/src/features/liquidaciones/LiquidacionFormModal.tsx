import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { listarUsuarios } from '@/features/usuarios/api'
import type { Usuario } from '@/features/usuarios/types'
import { crearLiquidacion, actualizarLiquidacion } from './api'
import type { Liquidacion } from './types'

function periodoActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const liquidacionSchema = z.object({
  id_usuario: z.number({ error: 'Selecciona un empleado' }).gt(0, { error: 'Selecciona un empleado' }),
  periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: 'Selecciona un periodo valido' }),
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
  const [empleados, setEmpleados] = useState<Usuario[]>([])
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const esEdicion = liquidacionExistente !== null

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LiquidacionForm>({
    resolver: zodResolver(liquidacionSchema),
    defaultValues: {
      id_usuario: liquidacionExistente?.id_usuario ?? 0,
      periodo: liquidacionExistente?.periodo ?? periodoActual(),
      monto: liquidacionExistente?.monto ?? 0,
      concepto: liquidacionExistente?.concepto ?? '',
      fecha_pago: liquidacionExistente?.fecha_pago ?? hoyISO(),
    },
  })

  useEffect(() => {
    listarUsuarios()
      .then((datos) => setEmpleados(datos.filter((u) => u.activo)))
      .catch(() => setEmpleados([]))
  }, [])

  const onSubmit = async (datos: LiquidacionForm) => {
    setErrorGeneral(null)
    try {
      if (liquidacionExistente) {
        await actualizarLiquidacion(liquidacionExistente.id_liquidacion, {
          monto: datos.monto,
          concepto: datos.concepto || null,
          fecha_pago: datos.fecha_pago,
        })
      } else {
        await crearLiquidacion({
          id_usuario: datos.id_usuario,
          periodo: datos.periodo,
          monto: datos.monto,
          concepto: datos.concepto || null,
          fecha_pago: datos.fecha_pago,
        })
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
            <label htmlFor="id_usuario" className="mb-1 block text-sm font-medium text-foreground">
              Empleado
            </label>
            <Controller
              name="id_usuario"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="id_usuario"
                  disabled={esEdicion}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  <option value={0}>Selecciona un empleado</option>
                  {empleados.map((empleado) => (
                    <option key={empleado.id_usuario} value={empleado.id_usuario}>
                      {empleado.nombre}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.id_usuario && (
              <p className="mt-1 text-sm text-destructive">{errors.id_usuario.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="periodo" className="mb-1 block text-sm font-medium text-foreground">
              Periodo (mes que cubre el pago)
            </label>
            <Controller
              name="periodo"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="periodo"
                  type="month"
                  disabled={esEdicion}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
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
