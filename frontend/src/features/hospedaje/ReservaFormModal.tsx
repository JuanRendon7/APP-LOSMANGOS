import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, type Control, useForm } from 'react-hook-form'
import { z } from 'zod'
import { buscarHuespedes, crearReserva } from './api'
import type { Habitacion } from './types'

const reservaSchema = z
  .object({
    cedula: z.string().min(1, { error: 'La cedula es requerida' }),
    nombre: z.string().min(1, { error: 'El nombre es requerido' }),
    contacto: z.string().min(1, { error: 'El contacto es requerido' }),
    placa: z.string().optional(),
    fecha_checkin_prevista: z.string().min(1, { error: 'Selecciona la fecha de checkin' }),
    fecha_checkout_prevista: z.string().min(1, { error: 'Selecciona la fecha de checkout' }),
  })
  .refine((datos) => datos.fecha_checkin_prevista < datos.fecha_checkout_prevista, {
    error: 'El checkout debe ser posterior al checkin',
    path: ['fecha_checkout_prevista'],
  })

type ReservaForm = z.infer<typeof reservaSchema>

function Campo({
  label,
  name,
  control,
  error,
  type = 'text',
}: {
  label: string
  name: keyof ReservaForm
  control: Control<ReservaForm>
  error?: string
  type?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            {...field}
            value={field.value ?? ''}
            id={name}
            type={type}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      />
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface Props {
  habitacion: Habitacion
  onCerrar: () => void
  onCreada: () => void
}

export function ReservaFormModal({ habitacion, onCerrar, onCreada }: Props) {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReservaForm>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      cedula: '',
      nombre: '',
      contacto: '',
      placa: '',
      fecha_checkin_prevista: '',
      fecha_checkout_prevista: '',
    },
  })

  const cedula = watch('cedula')

  useEffect(() => {
    if (cedula.trim().length < 5) return
    const timeout = setTimeout(async () => {
      try {
        const resultados = await buscarHuespedes(cedula.trim())
        const coincidencia = resultados.find((h) => h.cedula === cedula.trim())
        if (coincidencia) {
          setValue('nombre', coincidencia.nombre)
          setValue('contacto', coincidencia.contacto)
          setValue('placa', coincidencia.placa ?? '')
        }
      } catch {
        // busqueda de autollenado; un fallo aqui no bloquea el formulario
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [cedula, setValue])

  const onSubmit = async (datos: ReservaForm) => {
    setErrorGeneral(null)
    try {
      await crearReserva({
        id_habitacion: habitacion.id_habitacion,
        fecha_checkin_prevista: datos.fecha_checkin_prevista,
        fecha_checkout_prevista: datos.fecha_checkout_prevista,
        nombre: datos.nombre,
        cedula: datos.cedula,
        contacto: datos.contacto,
        placa: datos.placa || null,
      })
      onCreada()
    } catch {
      setErrorGeneral('No se pudo crear la reserva. Verifica los datos y las fechas.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-card-foreground">
            Nueva reserva · Habitacion {habitacion.numero}
          </h3>
          <button onClick={onCerrar} className="text-xs text-muted-foreground hover:underline">
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Campo label="Cedula" name="cedula" control={control} error={errors.cedula?.message} />
          <Campo label="Nombre" name="nombre" control={control} error={errors.nombre?.message} />
          <Campo
            label="Contacto"
            name="contacto"
            control={control}
            error={errors.contacto?.message}
          />
          <Campo
            label="Placa (opcional)"
            name="placa"
            control={control}
            error={errors.placa?.message}
          />
          <div className="grid grid-cols-2 gap-3">
            <Campo
              label="Checkin"
              name="fecha_checkin_prevista"
              type="date"
              control={control}
              error={errors.fecha_checkin_prevista?.message}
            />
            <Campo
              label="Checkout"
              name="fecha_checkout_prevista"
              type="date"
              control={control}
              error={errors.fecha_checkout_prevista?.message}
            />
          </div>

          {errorGeneral && <p className="text-sm text-destructive">{errorGeneral}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Creando...' : 'Crear reserva'}
          </button>
        </form>
      </div>
    </div>
  )
}
