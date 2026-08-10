export interface Liquidacion {
  id_liquidacion: number
  nombre_empleado: string
  periodo: string
  monto: number
  concepto: string | null
  fecha_pago: string
}

export interface LiquidacionCreateInput {
  nombre_empleado: string
  periodo: string
  monto: number
  concepto?: string | null
  fecha_pago: string
}

export interface LiquidacionUpdateInput {
  nombre_empleado?: string
  periodo?: string
  monto?: number
  concepto?: string | null
  fecha_pago?: string
}
