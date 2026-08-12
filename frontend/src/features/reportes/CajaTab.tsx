import { Coins, Receipt, TriangleAlert, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listarTurnos } from '@/features/caja/api'
import type { EstadoTurno, TipoTurno, TurnoCaja } from '@/features/caja/types'
import { listarUsuarios } from '@/features/usuarios/api'
import type { Usuario } from '@/features/usuarios/types'
import { descargarExcel, PALETA_EXCEL } from '@/shared/lib/excel'
import { formatoFechaBogota, formatoFechaHoraBogota } from '@/shared/lib/tiempo'
import { Chip, formatoMoneda, StatCard } from './shared'

type Detalle = 'turnos' | 'recaudado' | 'gastos' | 'descuadre' | null

interface Props {
  desde: string
  hasta: string
}

export function CajaTab({ desde, hasta }: Props) {
  const [turnos, setTurnos] = useState<TurnoCaja[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [idUsuario, setIdUsuario] = useState<number | 'TODOS'>('TODOS')
  const [estado, setEstado] = useState<EstadoTurno | 'TODOS'>('TODOS')
  const [tipo, setTipo] = useState<TipoTurno | 'TODOS'>('TODOS')
  const [detalle, setDetalle] = useState<Detalle>(null)

  useEffect(() => {
    listarUsuarios()
      .then(setUsuarios)
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      setCargando(true)
      try {
        const datos = await listarTurnos({
          desde: desde || undefined,
          hasta: hasta || undefined,
          idUsuario: idUsuario === 'TODOS' ? undefined : idUsuario,
          estado: estado === 'TODOS' ? undefined : estado,
          tipo: tipo === 'TODOS' ? undefined : tipo,
        })
        if (cancelado) return
        setTurnos(datos)
        setError(null)
      } catch {
        if (!cancelado) setError('No se pudo cargar el historico de caja.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }
    cargar()
    return () => {
      cancelado = true
    }
  }, [desde, hasta, idUsuario, estado, tipo])

  const nombrePorUsuario = useMemo(
    () => new Map(usuarios.map((u) => [u.id_usuario, u.nombre])),
    [usuarios],
  )

  const {
    totalRecaudado,
    totalGastos,
    turnosConDescuadre,
    datosMetodo,
  } = useMemo(() => {
    const recaudado = turnos.reduce(
      (suma, t) => suma + t.total_efectivo + t.total_tarjeta + t.total_transferencia + t.total_qr,
      0,
    )
    const gastos = turnos.reduce((suma, t) => suma + t.total_gastos, 0)
    const descuadre = turnos.filter((t) => t.diferencia !== null && t.diferencia !== 0)
    const metodo = [
      { metodo: 'Efectivo', monto: turnos.reduce((s, t) => s + t.total_efectivo, 0) },
      { metodo: 'Tarjeta', monto: turnos.reduce((s, t) => s + t.total_tarjeta, 0) },
      { metodo: 'Transferencia', monto: turnos.reduce((s, t) => s + t.total_transferencia, 0) },
      { metodo: 'QR', monto: turnos.reduce((s, t) => s + t.total_qr, 0) },
    ]
    return {
      totalRecaudado: recaudado,
      totalGastos: gastos,
      turnosConDescuadre: descuadre.sort(
        (a, b) => Math.abs(b.diferencia ?? 0) - Math.abs(a.diferencia ?? 0),
      ),
      datosMetodo: metodo,
    }
  }, [turnos])

  const turnosDetalle = useMemo(() => {
    const recaudo = (t: TurnoCaja) =>
      t.total_efectivo + t.total_tarjeta + t.total_transferencia + t.total_qr
    if (detalle === 'recaudado') {
      return [...turnos].sort((a, b) => recaudo(b) - recaudo(a))
    }
    if (detalle === 'gastos') {
      return [...turnos].sort((a, b) => b.total_gastos - a.total_gastos)
    }
    if (detalle === 'descuadre') {
      return turnosConDescuadre
    }
    return [...turnos].sort(
      (a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime(),
    )
  }, [turnos, detalle, turnosConDescuadre])

  const TITULO_DETALLE: Record<Exclude<Detalle, null>, string> = {
    turnos: 'Turnos en el rango',
    recaudado: 'Turnos ordenados por recaudo',
    gastos: 'Turnos ordenados por gastos',
    descuadre: 'Turnos con descuadre',
  }

  const descargar = async () => {
    if (turnos.length === 0) {
      setError('No hay turnos en ese rango.')
      return
    }
    const filas = turnos.map((t) => [
      t.creado_en,
      t.fecha_cierre,
      nombrePorUsuario.get(t.id_usuario) ?? `Usuario ${t.id_usuario}`,
      t.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado',
      t.tipo === 'NOCTURNO' ? 'Nocturna' : 'Diurna',
      t.monto_apertura,
      t.total_efectivo,
      t.total_tarjeta,
      t.total_transferencia,
      t.total_qr,
      t.total_gastos,
      t.monto_esperado_efectivo,
      t.monto_cierre_real,
      t.diferencia,
    ])
    await descargarExcel({
      nombreArchivo: `turnos_caja${desde && hasta ? `_${desde}_a_${hasta}` : ''}.xlsx`,
      hoja: 'Turnos de caja',
      titulo: 'Hotel Los Mangos · Historico de turnos de caja',
      subtitulo: `Rango: ${desde || 'inicio'} a ${hasta || 'hoy'} · Cajero: ${
        idUsuario === 'TODOS' ? 'Todos' : (nombrePorUsuario.get(idUsuario) ?? idUsuario)
      } · Estado: ${estado === 'TODOS' ? 'Todos' : estado} · Tipo: ${
        tipo === 'TODOS' ? 'Todos' : tipo === 'NOCTURNO' ? 'Nocturna' : 'Diurna'
      }`,
      columnas: [
        { titulo: 'Apertura', formato: 'fechahora' },
        { titulo: 'Cierre', formato: 'fechahora' },
        { titulo: 'Cajero', ancho: 20 },
        { titulo: 'Estado', ancho: 12 },
        { titulo: 'Tipo de caja', ancho: 12 },
        { titulo: 'Monto apertura', formato: 'moneda' },
        { titulo: 'Efectivo', formato: 'moneda', totalizar: true },
        { titulo: 'Tarjeta', formato: 'moneda', totalizar: true },
        { titulo: 'Transferencia', formato: 'moneda', totalizar: true },
        { titulo: 'QR', formato: 'moneda', totalizar: true },
        { titulo: 'Gastos', formato: 'moneda', totalizar: true },
        { titulo: 'Esperado efectivo', formato: 'moneda' },
        { titulo: 'Contado', formato: 'moneda' },
        {
          titulo: 'Diferencia',
          formato: 'moneda',
          totalizar: true,
          colorPorValor: (valor) => {
            const n = Number(valor)
            if (!Number.isFinite(n) || n === 0) return undefined
            return n < 0 ? PALETA_EXCEL.negativo : PALETA_EXCEL.positivo
          },
        },
      ],
      filas,
    })
  }

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando historico de caja...</p>
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Turnos en el rango"
          valor={turnos.length}
          sub="Abiertos o cerrados"
          activo={detalle === 'turnos'}
          onClick={() => setDetalle(detalle === 'turnos' ? null : 'turnos')}
        />
        <StatCard
          icon={Coins}
          label="Total recaudado"
          valor={formatoMoneda.format(totalRecaudado)}
          sub="Todos los metodos de pago"
          activo={detalle === 'recaudado'}
          onClick={() => setDetalle(detalle === 'recaudado' ? null : 'recaudado')}
        />
        <StatCard
          icon={Receipt}
          label="Total gastos"
          valor={formatoMoneda.format(totalGastos)}
          sub="Registrados en los turnos"
          activo={detalle === 'gastos'}
          onClick={() => setDetalle(detalle === 'gastos' ? null : 'gastos')}
        />
        <StatCard
          icon={TriangleAlert}
          label="Turnos con descuadre"
          valor={turnosConDescuadre.length}
          sub="Contado distinto de lo esperado"
          activo={detalle === 'descuadre'}
          onClick={() => setDetalle(detalle === 'descuadre' ? null : 'descuadre')}
        />
      </div>

      {detalle && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-serif text-base font-semibold text-foreground">
            {TITULO_DETALLE[detalle]} · {turnosDetalle.length}
          </h2>
          {turnosDetalle.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin turnos en este filtro.</p>
          ) : (
            <ul className="max-h-96 space-y-1.5 overflow-y-auto text-sm">
              {turnosDetalle.map((t) => {
                const recaudo =
                  t.total_efectivo + t.total_tarjeta + t.total_transferencia + t.total_qr
                return (
                  <li
                    key={t.id_turno}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {nombrePorUsuario.get(t.id_usuario) ?? `Usuario ${t.id_usuario}`}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {formatoFechaHoraBogota.format(new Date(t.creado_en))} ·{' '}
                          {t.tipo === 'NOCTURNO' ? 'Nocturna' : 'Diurna'} ·{' '}
                          {t.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Recaudo {formatoMoneda.format(recaudo)} · Gastos{' '}
                        {formatoMoneda.format(t.total_gastos)}
                        {t.diferencia !== null &&
                          ` · Diferencia ${t.diferencia > 0 ? '+' : ''}${formatoMoneda.format(t.diferencia)}`}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-foreground">
                      {formatoMoneda.format(t.monto_apertura)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Cajero</p>
          <select
            value={idUsuario}
            onChange={(e) => setIdUsuario(e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value))}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="TODOS">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id_usuario} value={u.id_usuario}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Estado</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip activo={estado === 'TODOS'} onClick={() => setEstado('TODOS')}>
              Todos
            </Chip>
            <Chip activo={estado === 'ABIERTO'} onClick={() => setEstado('ABIERTO')}>
              Abierto
            </Chip>
            <Chip activo={estado === 'CERRADO'} onClick={() => setEstado('CERRADO')}>
              Cerrado
            </Chip>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Tipo de caja</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip activo={tipo === 'TODOS'} onClick={() => setTipo('TODOS')}>
              Todos
            </Chip>
            <Chip activo={tipo === 'DIURNO'} onClick={() => setTipo('DIURNO')}>
              Diurna
            </Chip>
            <Chip activo={tipo === 'NOCTURNO'} onClick={() => setTipo('NOCTURNO')}>
              Nocturna
            </Chip>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-serif text-base font-semibold text-foreground">Recaudo por metodo de pago</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosMetodo}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="metodo" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} width={40} />
                <Tooltip
                  formatter={(valor) => formatoMoneda.format(Number(valor))}
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="monto" name="Monto" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-serif text-base font-semibold text-foreground">Turnos con descuadre</h2>
          {turnosConDescuadre.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ningun turno con diferencia en este filtro.</p>
          ) : (
            <ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm">
              {turnosConDescuadre.map((t) => {
                const diferencia = t.diferencia ?? 0
                return (
                  <li
                    key={t.id_turno}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5"
                  >
                    <span className="truncate">
                      {nombrePorUsuario.get(t.id_usuario) ?? `Usuario ${t.id_usuario}`} ·{' '}
                      {formatoFechaBogota.format(new Date(t.creado_en))} ·{' '}
                      {t.tipo === 'NOCTURNO' ? 'Nocturna' : 'Diurna'}
                    </span>
                    <span
                      className={`shrink-0 font-medium ${diferencia > 0 ? 'text-info-700' : 'text-peligro-700'}`}
                    >
                      {diferencia > 0 ? '+' : ''}
                      {formatoMoneda.format(diferencia)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="max-w-md space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-serif text-base font-semibold text-foreground">Exportar historico de turnos</h2>
        <p className="text-xs text-muted-foreground">
          Incluye el filtro de fechas, cajero y estado seleccionados arriba.
        </p>
        <button
          onClick={descargar}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Descargar Excel
        </button>
      </div>
    </div>
  )
}
