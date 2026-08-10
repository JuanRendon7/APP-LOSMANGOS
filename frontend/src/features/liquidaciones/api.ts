import { apiClient } from '@/shared/api/client'
import type { Liquidacion, LiquidacionCreateInput, LiquidacionUpdateInput } from './types'

export async function listarLiquidaciones(params: {
  idUsuario?: number
  periodo?: string
}): Promise<Liquidacion[]> {
  const { data } = await apiClient.get<Liquidacion[]>('/liquidaciones', {
    params: { id_usuario: params.idUsuario, periodo: params.periodo },
  })
  return data
}

export async function crearLiquidacion(datos: LiquidacionCreateInput): Promise<Liquidacion> {
  const { data } = await apiClient.post<Liquidacion>('/liquidaciones', datos)
  return data
}

export async function actualizarLiquidacion(
  id: number,
  datos: LiquidacionUpdateInput,
): Promise<Liquidacion> {
  const { data } = await apiClient.patch<Liquidacion>(`/liquidaciones/${id}`, datos)
  return data
}

export async function eliminarLiquidacion(id: number): Promise<void> {
  await apiClient.delete(`/liquidaciones/${id}`)
}
