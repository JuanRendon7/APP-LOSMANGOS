import { apiClient } from '@/shared/api/client'
import type { ConsumoItem, ConsumoItemInput, ConsumoResumen } from './types'

export async function listarConsumo(idReserva: number): Promise<ConsumoResumen> {
  const { data } = await apiClient.get<ConsumoResumen>('/consumo', {
    params: { id_reserva: idReserva },
  })
  return data
}

export async function agregarConsumo(datos: ConsumoItemInput): Promise<ConsumoItem> {
  const { data } = await apiClient.post<ConsumoItem>('/consumo', datos)
  return data
}

export async function eliminarConsumo(idConsumo: number): Promise<void> {
  await apiClient.delete(`/consumo/${idConsumo}`)
}
