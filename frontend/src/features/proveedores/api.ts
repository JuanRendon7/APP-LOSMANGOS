import { apiClient } from '@/shared/api/client'
import type { Proveedor, ProveedorInput } from './types'

export async function listarProveedores(): Promise<Proveedor[]> {
  const { data } = await apiClient.get<Proveedor[]>('/proveedores')
  return data
}

export async function crearProveedor(datos: ProveedorInput): Promise<Proveedor> {
  const { data } = await apiClient.post<Proveedor>('/proveedores', datos)
  return data
}

export async function actualizarProveedor(
  id: number,
  datos: Partial<ProveedorInput>,
): Promise<Proveedor> {
  const { data } = await apiClient.patch<Proveedor>(`/proveedores/${id}`, datos)
  return data
}
