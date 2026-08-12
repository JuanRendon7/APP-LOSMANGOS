export type EstadoTurno = 'ABIERTO' | 'CERRADO'
export type TipoTurno = 'DIURNO' | 'NOCTURNO'
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'QR'
export type OrigenVenta = 'HABITACION' | 'MESA' | 'MOSTRADOR'
export type OrigenVentaMostrador = 'BAR' | 'RESTAURANTE'
export type FuentePagoGasto = 'CAJA' | 'AHORROS'

export interface TurnoCaja {
  id_turno: number
  id_usuario: number
  nombre_usuario: string
  estado: EstadoTurno
  tipo: TipoTurno
  monto_apertura: number
  monto_cierre_real: number | null
  creado_en: string
  fecha_cierre: string | null
  total_efectivo: number
  total_tarjeta: number
  total_transferencia: number
  total_qr: number
  total_gastos: number
  total_gastos_caja: number
  monto_esperado_efectivo: number
  diferencia: number | null
}

export interface Gasto {
  id_gasto: number
  id_turno_caja: number
  concepto: string
  monto: number
  id_proveedor: number | null
  nombre_proveedor: string | null
  fuente_pago: FuentePagoGasto
  creado_en: string
}

export interface VentaItem {
  id_venta_item: number
  nombre_producto: string
  id_producto_bar: number | null
  id_producto_restaurante: number | null
  cantidad: number
  precio_unitario: number
}

export interface Venta {
  id_venta: number
  id_turno_caja: number
  origen: OrigenVenta
  id_reserva: number | null
  id_pedido: number | null
  nombre_mesa: string | null
  numero_habitacion: string | null
  metodo_pago: MetodoPago
  monto: number
  creado_en: string
  items: VentaItem[]
}

export interface VentaMostradorItemInput {
  origen: OrigenVentaMostrador
  id_producto: number
  cantidad: number
}
