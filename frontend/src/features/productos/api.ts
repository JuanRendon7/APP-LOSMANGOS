import { apiClient } from '@/shared/api/client'
import type {
  ProductoBar,
  ProductoBarInput,
  ProductoRestaurante,
  ProductoRestauranteInput,
} from './types'

export async function listarProductosRestaurante(): Promise<ProductoRestaurante[]> {
  const { data } = await apiClient.get<ProductoRestaurante[]>('/productos-restaurante')
  return data
}

export async function crearProductoRestaurante(
  datos: ProductoRestauranteInput,
): Promise<ProductoRestaurante> {
  const { data } = await apiClient.post<ProductoRestaurante>(
    '/productos-restaurante',
    datos,
  )
  return data
}

export async function actualizarProductoRestaurante(
  id: number,
  datos: Partial<ProductoRestauranteInput>,
): Promise<ProductoRestaurante> {
  const { data } = await apiClient.patch<ProductoRestaurante>(
    `/productos-restaurante/${id}`,
    datos,
  )
  return data
}

export async function listarProductosBar(): Promise<ProductoBar[]> {
  const { data } = await apiClient.get<ProductoBar[]>('/productos-bar')
  return data
}

export async function crearProductoBar(datos: ProductoBarInput): Promise<ProductoBar> {
  const { data } = await apiClient.post<ProductoBar>('/productos-bar', datos)
  return data
}

export async function actualizarProductoBar(
  id: number,
  datos: Partial<ProductoBarInput>,
): Promise<ProductoBar> {
  const { data } = await apiClient.patch<ProductoBar>(`/productos-bar/${id}`, datos)
  return data
}

export async function ajustarStockProductoBar(
  id: number,
  cantidad: number,
): Promise<ProductoBar> {
  const { data } = await apiClient.post<ProductoBar>(
    `/productos-bar/${id}/ajustar-stock`,
    { cantidad },
  )
  return data
}
