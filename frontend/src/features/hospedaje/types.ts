export type EstadoHabitacion = 'DISPONIBLE' | 'OCUPADA' | 'LIMPIEZA' | 'MANTENIMIENTO'
export type EstadoReserva = 'RESERVADA' | 'CHECK_IN' | 'CHECK_OUT' | 'CANCELADA'

export interface Huesped {
  id_huesped: number
  nombre: string
  cedula: string
  contacto: string
  placa: string | null
}

export interface Reserva {
  id_reserva: number
  id_habitacion: number
  id_huesped: number
  huesped: Huesped
  fecha_checkin_prevista: string
  fecha_checkout_prevista: string
  fecha_checkin_real: string | null
  fecha_checkout_real: string | null
  estado: EstadoReserva
  precio_total: number
  origen: string
}

export interface Habitacion {
  id_habitacion: number
  numero: string
  piso: number
  tipo: string
  estado: EstadoHabitacion
  reserva_activa: Reserva | null
}

export interface HabitacionInput {
  numero: string
  piso: number
  tipo: string
}

export interface ReservaCreateInput {
  id_habitacion: number
  fecha_checkin_prevista: string
  fecha_checkout_prevista: string
  nombre: string
  cedula: string
  contacto: string
  placa?: string | null
}
