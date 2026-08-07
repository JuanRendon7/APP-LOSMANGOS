import { apiClient } from '@/shared/api/client'
import type { Temporada, TemporadaInput } from './types'

export async function listarTemporadas(): Promise<Temporada[]> {
  const { data } = await apiClient.get<Temporada[]>('/temporadas')
  return data
}

export async function crearTemporada(datos: TemporadaInput): Promise<Temporada> {
  const { data } = await apiClient.post<Temporada>('/temporadas', datos)
  return data
}

export async function actualizarTemporada(
  id: number,
  datos: Partial<TemporadaInput>,
): Promise<Temporada> {
  const { data } = await apiClient.patch<Temporada>(`/temporadas/${id}`, datos)
  return data
}

export async function eliminarTemporada(id: number): Promise<void> {
  await apiClient.delete(`/temporadas/${id}`)
}
