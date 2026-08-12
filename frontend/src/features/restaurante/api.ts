import { apiClient } from '@/shared/api/client'
import type { EstadoPedido, Mesa, MesaInput, Pedido, PedidoItemInput } from './types'

export async function listarMesas(): Promise<Mesa[]> {
  const { data } = await apiClient.get<Mesa[]>('/mesas')
  return data
}

export async function listarPedidos(params: {
  idMesa?: number
  estado?: EstadoPedido
}): Promise<Pedido[]> {
  const { data } = await apiClient.get<Pedido[]>('/pedidos', {
    params: { id_mesa: params.idMesa, estado: params.estado },
  })
  return data
}

export async function crearMesa(datos: MesaInput): Promise<Mesa> {
  const { data } = await apiClient.post<Mesa>('/mesas', datos)
  return data
}

export async function actualizarMesa(
  id: number,
  datos: Partial<MesaInput> & { activo?: boolean },
): Promise<Mesa> {
  const { data } = await apiClient.patch<Mesa>(`/mesas/${id}`, datos)
  return data
}

export async function obtenerPedido(id: number): Promise<Pedido> {
  const { data } = await apiClient.get<Pedido>(`/pedidos/${id}`)
  return data
}

export async function crearPedido(idMesa: number): Promise<Pedido> {
  const { data } = await apiClient.post<Pedido>('/pedidos', { id_mesa: idMesa })
  return data
}

export async function agregarItem(
  idPedido: number,
  datos: PedidoItemInput,
): Promise<Pedido> {
  const { data } = await apiClient.post<Pedido>(`/pedidos/${idPedido}/items`, datos)
  return data
}

export async function eliminarItem(idPedido: number, idItem: number): Promise<Pedido> {
  const { data } = await apiClient.delete<Pedido>(
    `/pedidos/${idPedido}/items/${idItem}`,
  )
  return data
}

export async function enviarACocina(idPedido: number): Promise<Pedido> {
  const { data } = await apiClient.post<Pedido>(`/pedidos/${idPedido}/enviar-cocina`)
  return data
}

export async function avanzarEstado(idPedido: number): Promise<Pedido> {
  const { data } = await apiClient.post<Pedido>(`/pedidos/${idPedido}/avanzar`)
  return data
}

export async function cerrarPedido(idPedido: number): Promise<Pedido> {
  const { data } = await apiClient.post<Pedido>(`/pedidos/${idPedido}/cerrar`)
  return data
}

export async function moverPedido(idPedido: number, idMesaDestino: number): Promise<Pedido> {
  const { data } = await apiClient.post<Pedido>(`/pedidos/${idPedido}/mover`, {
    id_mesa_destino: idMesaDestino,
  })
  return data
}
