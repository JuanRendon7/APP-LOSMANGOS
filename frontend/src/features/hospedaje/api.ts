import { apiClient } from '@/shared/api/client'
import type { Habitacion, Huesped, Reserva, ReservaCreateInput } from './types'

export async function listarHabitaciones(): Promise<Habitacion[]> {
  const { data } = await apiClient.get<Habitacion[]>('/habitaciones')
  return data
}

export async function actualizarEstadoHabitacion(
  idHabitacion: number,
  estado: string,
): Promise<Habitacion> {
  const { data } = await apiClient.patch<Habitacion>(`/habitaciones/${idHabitacion}`, {
    estado,
  })
  return data
}

export async function buscarHuespedes(q: string): Promise<Huesped[]> {
  const { data } = await apiClient.get<Huesped[]>('/huespedes', { params: { q } })
  return data
}

export async function listarReservas(params: {
  idHabitacion?: number
  estado?: string
  desde?: string
  hasta?: string
}): Promise<Reserva[]> {
  const { data } = await apiClient.get<Reserva[]>('/reservas', {
    params: {
      id_habitacion: params.idHabitacion,
      estado: params.estado,
      desde: params.desde,
      hasta: params.hasta,
    },
  })
  return data
}

export async function crearReserva(datos: ReservaCreateInput): Promise<Reserva> {
  const { data } = await apiClient.post<Reserva>('/reservas', datos)
  return data
}

export async function checkIn(idReserva: number): Promise<Reserva> {
  const { data } = await apiClient.post<Reserva>(`/reservas/${idReserva}/check-in`)
  return data
}

export async function checkOut(idReserva: number): Promise<Reserva> {
  const { data } = await apiClient.post<Reserva>(`/reservas/${idReserva}/check-out`)
  return data
}

export async function cancelarReserva(idReserva: number): Promise<Reserva> {
  const { data } = await apiClient.post<Reserva>(`/reservas/${idReserva}/cancelar`)
  return data
}
