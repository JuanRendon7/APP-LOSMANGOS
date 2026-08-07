export type EstadoMesa = 'LIBRE' | 'OCUPADA'
export type EstadoPedido =
  | 'ABIERTO'
  | 'ENVIADO_COCINA'
  | 'EN_PREPARACION'
  | 'LISTO'
  | 'ENTREGADO'
  | 'CERRADO'

export interface PedidoItem {
  id_item: number
  id_producto: number
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  nota: string | null
}

export interface Pedido {
  id_pedido: number
  id_mesa: number
  nombre_mesa: string
  estado: EstadoPedido
  items: PedidoItem[]
  total: number
  enviado_cocina_en: string | null
  cerrado_en: string | null
  creado_en: string
}

export interface Mesa {
  id_mesa: number
  nombre: string
  capacidad: number
  pos_x: number
  pos_y: number
  estado: EstadoMesa
  activo: boolean
  pedido_activo: Pedido | null
}

export interface MesaInput {
  nombre: string
  capacidad: number
  pos_x?: number
  pos_y?: number
}
