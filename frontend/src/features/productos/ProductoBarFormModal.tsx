import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { actualizarProductoBar, crearProductoBar } from './api'
import type { ProductoBar } from './types'

const productoSchema = z.object({
  nombre: z.string().min(1, { error: 'El nombre es requerido' }),
  codigo_barras: z.string().min(1, { error: 'El codigo de barras es requerido' }),
  precio_costo: z
    .number({ error: 'Ingresa un costo valido' })
    .min(0, { error: 'El costo no puede ser negativo' }),
  precio_venta: z
    .number({ error: 'Ingresa un precio valido' })
    .gt(0, { error: 'El precio debe ser mayor a 0' }),
  stock: z
    .number({ error: 'Ingresa una cantidad valida' })
    .min(0, { error: 'El stock no puede ser negativo' }),
  activo: z.boolean(),
})

type ProductoForm = z.infer<typeof productoSchema>

function CampoNumero({
  id,
  label,
  value,
  onChange,
  onBlur,
  name,
  inputRef,
  error,
  step = 500,
}: {
  id: string
  label: string
  value: number
  onChange: (valor: number) => void
  onBlur: () => void
  name: string
  inputRef: React.Ref<HTMLInputElement>
  error?: string
  step?: number
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        step={step}
        name={name}
        ref={inputRef}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface Props {
  productoExistente: ProductoBar | null
  onCerrar: () => void
  onGuardado: () => void
}

export function ProductoBarFormModal({ productoExistente, onCerrar, onGuardado }: Props) {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const esEdicion = productoExistente !== null

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductoForm>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: productoExistente?.nombre ?? '',
      codigo_barras: productoExistente?.codigo_barras ?? '',
      precio_costo: productoExistente?.precio_costo ?? 0,
      precio_venta: productoExistente?.precio_venta ?? 0,
      stock: productoExistente?.stock ?? 0,
      activo: productoExistente?.activo ?? true,
    },
  })

  const onSubmit = async (datos: ProductoForm) => {
    setErrorGeneral(null)
    try {
      if (productoExistente) {
        const { stock: _stock, ...sinStock } = datos
        await actualizarProductoBar(productoExistente.id_producto, sinStock)
      } else {
        await crearProductoBar(datos)
      }
      onGuardado()
    } catch {
      setErrorGeneral(
        'No se pudo guardar el producto. Verifica que el codigo de barras no este repetido.',
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-card-foreground">
            {productoExistente ? 'Editar producto' : 'Nuevo producto de bar'}
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
              htmlFor="codigo_barras"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Codigo de barras
            </label>
            <Controller
              name="codigo_barras"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="codigo_barras"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
            {errors.codigo_barras && (
              <p className="mt-1 text-sm text-destructive">{errors.codigo_barras.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="precio_costo"
              control={control}
              render={({ field }) => (
                <CampoNumero
                  id="precio_costo"
                  label="Costo (COP)"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  inputRef={field.ref}
                  error={errors.precio_costo?.message}
                />
              )}
            />
            <Controller
              name="precio_venta"
              control={control}
              render={({ field }) => (
                <CampoNumero
                  id="precio_venta"
                  label="Precio de venta (COP)"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  inputRef={field.ref}
                  error={errors.precio_venta?.message}
                />
              )}
            />
          </div>

          {!esEdicion && (
            <Controller
              name="stock"
              control={control}
              render={({ field }) => (
                <CampoNumero
                  id="stock"
                  label="Stock inicial"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  inputRef={field.ref}
                  error={errors.stock?.message}
                  step={1}
                />
              )}
            />
          )}
          {esEdicion && (
            <p className="text-xs text-muted-foreground">
              Stock actual: {productoExistente.stock}. Usa "Ajustar stock" en la tabla
              para cambiarlo.
            </p>
          )}

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
