import { apiClient } from '@/shared/api/client'
import type {
  Gasto,
  MetodoPago,
  OrigenVenta,
  TurnoCaja,
  Venta,
  VentaMostradorItemInput,
} from './types'

export async function obtenerTurnoActual(): Promise<TurnoCaja | null> {
  const { data } = await apiClient.get<TurnoCaja | null>('/caja/turnos/actual')
  return data
}

export async function abrirTurno(montoApertura: number): Promise<TurnoCaja> {
  const { data } = await apiClient.post<TurnoCaja>('/caja/turnos', {
    monto_apertura: montoApertura,
  })
  return data
}

export async function cerrarTurno(
  idTurno: number,
  montoCierreReal: number,
): Promise<TurnoCaja> {
  const { data } = await apiClient.post<TurnoCaja>(`/caja/turnos/${idTurno}/cerrar`, {
    monto_cierre_real: montoCierreReal,
  })
  return data
}

export async function listarGastos(idTurno: number): Promise<Gasto[]> {
  const { data } = await apiClient.get<Gasto[]>('/caja/gastos', {
    params: { id_turno: idTurno },
  })
  return data
}

export async function crearGasto(concepto: string, monto: number): Promise<Gasto> {
  const { data } = await apiClient.post<Gasto>('/caja/gastos', { concepto, monto })
  return data
}

export async function actualizarGasto(
  idGasto: number,
  datos: { concepto?: string; monto?: number },
): Promise<Gasto> {
  const { data } = await apiClient.patch<Gasto>(`/caja/gastos/${idGasto}`, datos)
  return data
}

export async function eliminarGasto(idGasto: number): Promise<void> {
  await apiClient.delete(`/caja/gastos/${idGasto}`)
}

export async function cobrarHabitacion(
  idReserva: number,
  metodoPago: MetodoPago,
): Promise<Venta> {
  const { data } = await apiClient.post<Venta>('/caja/ventas/habitacion', {
    id_reserva: idReserva,
    metodo_pago: metodoPago,
  })
  return data
}

export async function cobrarPedido(
  idPedido: number,
  metodoPago: MetodoPago,
): Promise<Venta> {
  const { data } = await apiClient.post<Venta>('/caja/ventas/pedido', {
    id_pedido: idPedido,
    metodo_pago: metodoPago,
  })
  return data
}

export async function ventaMostrador(
  items: VentaMostradorItemInput[],
  metodoPago: MetodoPago,
): Promise<Venta> {
  const { data } = await apiClient.post<Venta>('/caja/ventas/mostrador', {
    items,
    metodo_pago: metodoPago,
  })
  return data
}

export async function listarVentas(idTurno: number, origen?: OrigenVenta): Promise<Venta[]> {
  const { data } = await apiClient.get<Venta[]>('/caja/ventas', {
    params: { id_turno: idTurno, origen },
  })
  return data
}
