import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listarTurnos } from '@/features/caja/api'
import { listarConfiguracion } from '@/features/configuracion/api'
import { listarHabitaciones, listarReservas } from '@/features/hospedaje/api'
import { listarProductosBar } from '@/features/productos/api'
import { listarPedidos } from '@/features/restaurante/api'
import { useAuth } from '@/shared/auth/AuthContext'
import { reproducirSonido } from './sonidos'
import type { Notificacion } from './types'

const UMBRAL_HORAS_TURNO_ABIERTO = 12
const CLAVE_DESCARTADAS = 'notificaciones_descartadas'
const CLAVE_LEIDAS = 'notificaciones_leidas'
const TTL_DESCARTE_MS = 20 * 60 * 60 * 1000

function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function leerMapa(clave: string): Record<string, number> {
  try {
    const crudo = localStorage.getItem(clave)
    return crudo ? JSON.parse(crudo) : {}
  } catch {
    return {}
  }
}

function guardarMapa(clave: string, mapa: Record<string, number>) {
  try {
    localStorage.setItem(clave, JSON.stringify(mapa))
  } catch {
    // localStorage no disponible; el estado simplemente no persiste
  }
}

const ORDEN_NIVEL: Record<Notificacion['nivel'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

export function useNotificaciones() {
  const { tienePermiso, tieneRol } = useAuth()
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [descartadas, setDescartadas] = useState<Record<string, number>>(() =>
    leerMapa(CLAVE_DESCARTADAS),
  )
  const [leidas, setLeidas] = useState<Record<string, number>>(() => leerMapa(CLAVE_LEIDAS))
  const sonidoRef = useRef('campana')
  const idsAnterioresRef = useRef<Set<string> | null>(null)
  const descartadasRef = useRef<Record<string, number>>({})

  const veHabitaciones = tienePermiso('HABITACIONES', 'VER')
  const veProductosBar = tienePermiso('PRODUCTOS_BAR', 'VER')
  const veReportes = tienePermiso('REPORTES', 'VER')
  // Gateado por rol, no por permiso generico: Empleado tambien tiene PEDIDOS:VER
  // (toma pedidos) pero no deberia recibir la alerta de "pedido nuevo en cocina".
  const esCocina = tieneRol('COCINA')

  useEffect(() => {
    listarConfiguracion()
      .then((items) => {
        const sonido = items.find((i) => i.clave === 'sonido_notificacion')
        if (sonido) sonidoRef.current = sonido.valor
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    descartadasRef.current = descartadas
  }, [descartadas])

  const cargar = useCallback(async () => {
    const hoy = hoyISO()
    const items: Notificacion[] = []
    let huboError = false

    try {
      if (veProductosBar) {
        const productos = await listarProductosBar()
        for (const p of productos) {
          if (p.activo && p.stock <= p.umbral_stock_bajo) {
            items.push({
              id: `stock-${p.id_producto}`,
              nivel: 'warning',
              titulo: `Stock bajo: ${p.nombre}`,
              descripcion: `Quedan ${p.stock} unidades en el bar`,
              enlace: '/productos/bar',
            })
          }
        }
      }

      if (veHabitaciones) {
        const [habitaciones, reservadas, enCheckin] = await Promise.all([
          listarHabitaciones(),
          listarReservas({ estado: 'RESERVADA' }),
          listarReservas({ estado: 'CHECK_IN' }),
        ])
        const numeroPorHabitacion = new Map(habitaciones.map((h) => [h.id_habitacion, h.numero]))

        for (const r of reservadas) {
          const numero = numeroPorHabitacion.get(r.id_habitacion) ?? '—'
          if (r.fecha_checkin_prevista === hoy) {
            items.push({
              id: `llegada-${r.id_reserva}`,
              nivel: 'info',
              titulo: `Llega hoy: ${r.huesped.nombre}`,
              descripcion: `Habitacion ${numero}`,
              enlace: '/habitaciones',
            })
          } else if (r.fecha_checkin_prevista < hoy) {
            items.push({
              id: `atrasada-${r.id_reserva}`,
              nivel: 'critical',
              titulo: `Check-in atrasado: ${r.huesped.nombre}`,
              descripcion: `Esperado el ${r.fecha_checkin_prevista} · Habitacion ${numero}`,
              enlace: '/habitaciones',
            })
          }
        }

        for (const r of enCheckin) {
          if (r.fecha_checkout_prevista === hoy) {
            const numero = numeroPorHabitacion.get(r.id_habitacion) ?? '—'
            items.push({
              id: `checkout-${r.id_reserva}`,
              nivel: 'info',
              titulo: `Checkout hoy: ${r.huesped.nombre}`,
              descripcion: `Habitacion ${numero}`,
              enlace: '/habitaciones',
            })
          }
        }
      }

      if (esCocina) {
        const pendientesCocina = await listarPedidos({ estado: 'ENVIADO_COCINA' })
        for (const p of pendientesCocina) {
          const resumen = p.items.map((i) => `${i.cantidad}× ${i.nombre_producto}`).join(', ')
          items.push({
            id: `cocina-${p.id_pedido}`,
            nivel: 'warning',
            titulo: `Nuevo pedido: ${p.nombre_mesa}`,
            descripcion: resumen || 'Sin detalle de productos',
            enlace: '/cocina',
          })
        }
      }

      if (veReportes) {
        const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const ayerISO = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`

        const [abiertos, cerrados] = await Promise.all([
          listarTurnos({ estado: 'ABIERTO' }),
          listarTurnos({ estado: 'CERRADO', desde: ayerISO }),
        ])

        for (const t of abiertos) {
          const horas = (Date.now() - new Date(t.creado_en).getTime()) / (60 * 60 * 1000)
          if (horas >= UMBRAL_HORAS_TURNO_ABIERTO) {
            items.push({
              id: `turno-abierto-${t.id_turno}`,
              nivel: 'warning',
              titulo: `Caja abierta hace ${Math.floor(horas)}h`,
              descripcion: `Abierta por: ${t.nombre_usuario}`,
              enlace: '/caja',
            })
          }
        }

        for (const t of cerrados) {
          if (t.diferencia !== null && t.diferencia !== 0) {
            const formatoMoneda = new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              maximumFractionDigits: 0,
            })
            items.push({
              id: `descuadre-${t.id_turno}`,
              nivel: 'critical',
              titulo: `Descuadre de caja: ${t.diferencia > 0 ? '+' : ''}${formatoMoneda.format(t.diferencia)}`,
              descripcion: `Cajero: ${t.nombre_usuario}`,
              enlace: '/reportes',
            })
          }
        }
      }
    } catch {
      // si alguna fuente falla, se muestran las notificaciones que si se pudieron calcular
      huboError = true
    }

    items.sort((a, b) => ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel])

    // Si un sondeo fallo a medias (ej. el backend se reinicio por una migracion),
    // "items" queda incompleto o vacio — no lo usamos como base de comparacion,
    // porque en el siguiente sondeo exitoso TODO parece "nuevo" y suena sin que
    // nada haya cambiado en realidad. Tampoco cuenta como "nueva" una alerta que
    // el usuario ya descarto y sigue dentro del TTL, aunque su id haya
    // desaparecido y reaparecido entre sondeos (ej. stock que sube y baja).
    if (!huboError) {
      const idsActuales = new Set(items.map((n) => n.id))
      const idsAnteriores = idsAnterioresRef.current
      if (idsAnteriores !== null) {
        const ahora = Date.now()
        const yaDescartada = (id: string) => {
          const descartadaEn = descartadasRef.current[id]
          return descartadaEn !== undefined && ahora - descartadaEn <= TTL_DESCARTE_MS
        }
        const hayNuevas = items.some((n) => !idsAnteriores.has(n.id) && !yaDescartada(n.id))
        if (hayNuevas) reproducirSonido(sonidoRef.current)
      }
      idsAnterioresRef.current = idsActuales
    }

    setNotificaciones(items)
  }, [veHabitaciones, veProductosBar, veReportes, esCocina])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 60000)
    return () => clearInterval(id)
  }, [cargar])

  const descartar = useCallback((id: string) => {
    setDescartadas((actual) => {
      const nuevo = { ...actual, [id]: Date.now() }
      guardarMapa(CLAVE_DESCARTADAS, nuevo)
      return nuevo
    })
    setLeidas((actual) => {
      if (!(id in actual)) return actual
      const nuevo = { ...actual }
      delete nuevo[id]
      guardarMapa(CLAVE_LEIDAS, nuevo)
      return nuevo
    })
  }, [])

  const marcarLeida = useCallback((id: string) => {
    setLeidas((actual) => {
      if (actual[id]) return actual
      const nuevo = { ...actual, [id]: Date.now() }
      guardarMapa(CLAVE_LEIDAS, nuevo)
      return nuevo
    })
  }, [])

  const activas = useMemo(() => {
    const ahora = Date.now()
    return notificaciones.filter((n) => {
      const descartadaEn = descartadas[n.id]
      return !descartadaEn || ahora - descartadaEn > TTL_DESCARTE_MS
    })
  }, [notificaciones, descartadas])

  const pendientes = useMemo(
    () => activas.filter((n) => !leidas[n.id]).length,
    [activas, leidas],
  )

  return { notificaciones: activas, leidas, pendientes, descartar, marcarLeida }
}
