import axios from 'axios'
import { apiClient } from '@/shared/api/client'
import type { ComandaConsumo, ConsumoItem, ConsumoItemInput, ConsumoResumen } from './types'

export function mensajeErrorConsumo(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.detail === 'string') {
    return err.response.data.detail
  }
  return fallback
}

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

export async function enviarComandaConsumo(idReserva: number): Promise<ComandaConsumo> {
  const { data } = await apiClient.post<ComandaConsumo>(
    `/consumo/reserva/${idReserva}/comanda`,
  )
  return data
}

export async function obtenerComandaConsumo(
  idReserva: number,
  ids: number[],
): Promise<ComandaConsumo> {
  const { data } = await apiClient.get<ComandaConsumo>(
    `/consumo/reserva/${idReserva}/comanda`,
    { params: { ids: ids.join(',') } },
  )
  return data
}
