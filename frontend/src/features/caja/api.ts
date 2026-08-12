import axios from 'axios'
import { apiClient } from '@/shared/api/client'
import type {
  EstadoTurno,
  FuentePagoGasto,
  Gasto,
  MetodoPago,
  OrigenVenta,
  TipoTurno,
  TurnoCaja,
  Venta,
  VentaMostradorItemInput,
} from './types'

export function mensajeErrorCaja(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.detail === 'string') {
    return err.response.data.detail
  }
  return fallback
}

export async function obtenerTurnoActual(tipo: TipoTurno = 'DIURNO'): Promise<TurnoCaja | null> {
  const { data } = await apiClient.get<TurnoCaja | null>('/caja/turnos/actual', {
    params: { tipo },
  })
  return data
}

export async function listarTurnosAbiertos(): Promise<TurnoCaja[]> {
  const { data } = await apiClient.get<TurnoCaja[]>('/caja/turnos/abiertos')
  return data
}

export async function abrirTurno(
  montoApertura: number,
  tipo: TipoTurno = 'DIURNO',
): Promise<TurnoCaja> {
  const { data } = await apiClient.post<TurnoCaja>('/caja/turnos', {
    monto_apertura: montoApertura,
    tipo,
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

export async function crearGasto(
  concepto: string,
  monto: number,
  idTurno?: number,
  idProveedor?: number,
  fuentePago: FuentePagoGasto = 'CAJA',
): Promise<Gasto> {
  const { data } = await apiClient.post<Gasto>('/caja/gastos', {
    concepto,
    monto,
    id_turno: idTurno,
    id_proveedor: idProveedor,
    fuente_pago: fuentePago,
  })
  return data
}

export async function actualizarGasto(
  idGasto: number,
  datos: {
    concepto?: string
    monto?: number
    id_proveedor?: number
    fuente_pago?: FuentePagoGasto
  },
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
  idTurno?: number,
): Promise<Venta> {
  const { data } = await apiClient.post<Venta>('/caja/ventas/habitacion', {
    id_reserva: idReserva,
    metodo_pago: metodoPago,
    id_turno: idTurno,
  })
  return data
}

export async function cobrarPedido(
  idPedido: number,
  metodoPago: MetodoPago,
  idTurno?: number,
): Promise<Venta> {
  const { data } = await apiClient.post<Venta>('/caja/ventas/pedido', {
    id_pedido: idPedido,
    metodo_pago: metodoPago,
    id_turno: idTurno,
  })
  return data
}

export async function ventaMostrador(
  items: VentaMostradorItemInput[],
  metodoPago: MetodoPago,
  idTurno?: number,
): Promise<Venta> {
  const { data } = await apiClient.post<Venta>('/caja/ventas/mostrador', {
    items,
    metodo_pago: metodoPago,
    id_turno: idTurno,
  })
  return data
}

export async function obtenerVenta(idVenta: number): Promise<Venta> {
  const { data } = await apiClient.get<Venta>(`/caja/ventas/${idVenta}`)
  return data
}

export async function listarVentas(params: {
  idTurno?: number
  metodoPago?: MetodoPago
  origen?: OrigenVenta
  desde?: string
  hasta?: string
}): Promise<Venta[]> {
  const { data } = await apiClient.get<Venta[]>('/caja/ventas', {
    params: {
      id_turno: params.idTurno,
      metodo_pago: params.metodoPago,
      origen: params.origen,
      desde: params.desde,
      hasta: params.hasta,
    },
  })
  return data
}

export async function deshacerUltimaVenta(idTurno?: number): Promise<Venta> {
  const { data } = await apiClient.post<Venta>('/caja/ventas/deshacer-ultima', null, {
    params: { id_turno: idTurno },
  })
  return data
}

export async function listarTurnos(params: {
  idUsuario?: number
  estado?: EstadoTurno
  desde?: string
  hasta?: string
  tipo?: TipoTurno
}): Promise<TurnoCaja[]> {
  const { data } = await apiClient.get<TurnoCaja[]>('/caja/turnos', {
    params: {
      id_usuario: params.idUsuario,
      estado: params.estado,
      desde: params.desde,
      hasta: params.hasta,
      tipo: params.tipo,
    },
  })
  return data
}
