export interface Liquidacion {
  id_liquidacion: number
  id_usuario: number
  nombre_empleado: string
  periodo: string
  monto: number
  concepto: string | null
  fecha_pago: string
}

export interface LiquidacionCreateInput {
  id_usuario: number
  periodo: string
  monto: number
  concepto?: string | null
  fecha_pago: string
}

export interface LiquidacionUpdateInput {
  monto?: number
  concepto?: string | null
  fecha_pago?: string
}
