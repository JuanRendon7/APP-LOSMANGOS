import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { actualizarProductoRestaurante, crearProductoRestaurante } from './api'
import {
  CATEGORIAS_PRODUCTO_RESTAURANTE,
  ETIQUETA_CATEGORIA_RESTAURANTE,
  type ProductoRestaurante,
} from './types'

const productoSchema = z.object({
  nombre: z.string().min(1, { error: 'El nombre es requerido' }),
  categoria: z.enum(['DESAYUNO', 'ALMUERZO', 'CENA', 'ADICIONALES']),
  precio_venta: z
    .number({ error: 'Ingresa un precio valido' })
    .gt(0, { error: 'El precio debe ser mayor a 0' }),
  activo: z.boolean(),
})

type ProductoForm = z.infer<typeof productoSchema>

interface Props {
  productoExistente: ProductoRestaurante | null
  onCerrar: () => void
  onGuardado: () => void
}

export function ProductoRestauranteFormModal({
  productoExistente,
  onCerrar,
  onGuardado,
}: Props) {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductoForm>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: productoExistente?.nombre ?? '',
      categoria: productoExistente?.categoria ?? 'ALMUERZO',
      precio_venta: productoExistente?.precio_venta ?? 0,
      activo: productoExistente?.activo ?? true,
    },
  })

  const onSubmit = async (datos: ProductoForm) => {
    setErrorGeneral(null)
    try {
      if (productoExistente) {
        await actualizarProductoRestaurante(productoExistente.id_producto, datos)
      } else {
        await crearProductoRestaurante(datos)
      }
      onGuardado()
    } catch {
      setErrorGeneral('No se pudo guardar el producto.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-card-foreground">
            {productoExistente ? 'Editar producto' : 'Nuevo producto'}
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
            <label htmlFor="categoria" className="mb-1 block text-sm font-medium text-foreground">
              Categoria
            </label>
            <Controller
              name="categoria"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="categoria"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {CATEGORIAS_PRODUCTO_RESTAURANTE.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {ETIQUETA_CATEGORIA_RESTAURANTE[categoria]}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          <div>
            <label
              htmlFor="precio_venta"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Precio (COP)
            </label>
            <Controller
              name="precio_venta"
              control={control}
              render={({ field }) => (
                <input
                  id="precio_venta"
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
            {errors.precio_venta && (
              <p className="mt-1 text-sm text-destructive">{errors.precio_venta.message}</p>
            )}
          </div>

          {productoExistente && (
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
