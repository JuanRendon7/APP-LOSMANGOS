import { apiClient } from '@/shared/api/client'
import type { ConfiguracionItem } from './types'

export async function listarConfiguracion(): Promise<ConfiguracionItem[]> {
  const { data } = await apiClient.get<ConfiguracionItem[]>('/configuracion')
  return data
}

export async function actualizarConfiguracion(
  clave: string,
  valor: string,
): Promise<ConfiguracionItem> {
  const { data } = await apiClient.patch<ConfiguracionItem>(`/configuracion/${clave}`, {
    valor,
  })
  return data
}
