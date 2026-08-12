export type OrigenConsumo = 'BAR' | 'RESTAURANTE'

export interface ConsumoItemInput {
  id_reserva: number
  origen: OrigenConsumo
  id_producto: number
  cantidad: number
}

export interface ConsumoItem {
  id_consumo: number
  id_reserva: number
  origen: OrigenConsumo
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  facturado: boolean
  enviado_cocina_en: string | null
}

export interface ConsumoResumen {
  items: ConsumoItem[]
  total: number
}

export interface ComandaConsumo {
  numero_habitacion: string
  nombre_huesped: string
  items: ConsumoItem[]
}
