import { apiClient } from '@/shared/api/client'
import type { Usuario, UsuarioCreateInput, UsuarioUpdateInput } from './types'

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data } = await apiClient.get<Usuario[]>('/usuarios')
  return data
}

export async function crearUsuario(datos: UsuarioCreateInput): Promise<Usuario> {
  const { data } = await apiClient.post<Usuario>('/usuarios', datos)
  return data
}

export async function actualizarUsuario(
  id: number,
  datos: UsuarioUpdateInput,
): Promise<Usuario> {
  const { data } = await apiClient.patch<Usuario>(`/usuarios/${id}`, datos)
  return data
}
