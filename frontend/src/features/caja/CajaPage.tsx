import {
  Banknote,
  BedDouble,
  Clock,
  Coins,
  CreditCard,
  LayoutGrid,
  Percent,
  QrCode,
  Receipt,
  Repeat,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '@/shared/auth/AuthContext'
import {
  abrirTurno,
  actualizarGasto,
  cerrarTurno,
  crearGasto,
  eliminarGasto,
  listarGastos,
  listarVentas,
  obtenerTurnoActual,
} from './api'
import type { Gasto, OrigenVenta, TurnoCaja, Venta } from './types'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function tiempoTranscurrido(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  const horas = Math.floor(mins / 60)
  const minutos = mins % 60
  return horas === 0 ? `${minutos}m` : `${horas}h ${minutos}m`
}

const ETIQUETA_ORIGEN: Record<OrigenVenta, string> = {
  HABITACION: 'Habitacion',
  MESA: 'Mesa',
  MOSTRADOR: 'Mostrador',
}

const ICONO_ORIGEN: Record<OrigenVenta, LucideIcon> = {
  HABITACION: BedDouble,
  MESA: LayoutGrid,
  MOSTRADOR: ShoppingCart,
}

export function CajaPage() {
  const { tienePermiso } = useAuth()
  const [turno, setTurno] = useState<TurnoCaja | null | undefined>(undefined)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ultimoCierre, setUltimoCierre] = useState<TurnoCaja | null>(null)
  const [, forzarTick] = useState(0)

  const puedeAbrir = tienePermiso('CAJA', 'CREAR')
  const puedeCerrar = tienePermiso('CAJA', 'CERRAR')
  const puedeCrearGasto = tienePermiso('GASTOS', 'CREAR')
  const puedeEditarGasto = tienePermiso('GASTOS', 'EDITAR')
  const puedeEliminarGasto = tienePermiso('GASTOS', 'ELIMINAR')

  const cargar = useCallback(async () => {
    try {
      const actual = await obtenerTurnoActual()
      setTurno(actual)
      if (actual) {
        const [gastosDatos, ventasDatos] = await Promise.all([
          listarGastos(actual.id_turno),
          listarVentas(actual.id_turno),
        ])
        setGastos(gastosDatos)
        setVentas(ventasDatos)
      } else {
        setGastos([])
        setVentas([])
      }
    } catch {
      setError('No se pudo cargar el estado de la caja.')
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    const id = setInterval(() => forzarTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  if (turno === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!turno && ultimoCierre && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-medium text-foreground">Caja cerrada.</p>
          <p className="text-muted-foreground">
            Esperado: {formatoMoneda.format(ultimoCierre.monto_esperado_efectivo)} ·
            Contado: {formatoMoneda.format(ultimoCierre.monto_cierre_real ?? 0)} ·
            Diferencia: {formatoMoneda.format(ultimoCierre.diferencia ?? 0)}
          </p>
        </div>
      )}
      {!turno && (
        <AbrirCajaCard
          puedeAbrir={puedeAbrir}
          onAbierta={async () => {
            setUltimoCierre(null)
            await cargar()
          }}
          setError={setError}
        />
      )}
      {turno && (
        <>
          <ResumenTurnoCard turno={turno} ventas={ventas} />
          <GastosCard
            turno={turno}
            gastos={gastos}
            puedeCrear={puedeCrearGasto}
            puedeEditar={puedeEditarGasto}
            puedeEliminar={puedeEliminarGasto}
            onCambio={cargar}
            setError={setError}
          />
          {puedeCerrar && (
            <CerrarCajaCard
              turno={turno}
              onCerrada={async (cerrado) => {
                setUltimoCierre(cerrado)
                await cargar()
              }}
              setError={setError}
            />
          )}
        </>
      )}
    </div>
  )
}

function AbrirCajaCard({
  puedeAbrir,
  onAbierta,
  setError,
}: {
  puedeAbrir: boolean
  onAbierta: () => Promise<void> | void
  setError: (msg: string | null) => void
}) {
  const [monto, setMonto] = useState(0)
  const [procesando, setProcesando] = useState(false)

  if (!puedeAbrir) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">No tienes una caja abierta.</p>
      </div>
    )
  }

  const manejarAbrir = async () => {
    setError(null)
    setProcesando(true)
    try {
      await abrirTurno(monto)
      await onAbierta()
    } catch {
      setError('No se pudo abrir la caja.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-card-foreground">
        <Wallet size={18} className="text-primary" /> Abrir caja
      </h3>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Efectivo inicial
          </label>
          <input
            type="number"
            min={0}
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value) || 0)}
            className="w-40 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={manejarAbrir}
          disabled={procesando}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Abrir caja
        </button>
      </div>
    </div>
  )
}

function StatMini({
  icon: Icono,
  etiqueta,
  valor,
}: {
  icon: LucideIcon
  etiqueta: string
  valor: string
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted text-primary">
        <Icono size={14} />
      </div>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="text-sm font-semibold text-foreground">{valor}</p>
    </div>
  )
}

function ResumenTurnoCard({ turno, ventas }: { turno: TurnoCaja; ventas: Venta[] }) {
  const datosGrafico = [
    { metodo: 'Efectivo', monto: turno.total_efectivo },
    { metodo: 'Tarjeta', monto: turno.total_tarjeta },
    { metodo: 'Transferencia', monto: turno.total_transferencia },
    { metodo: 'QR', monto: turno.total_qr },
  ]

  const conteoOrigen = (['HABITACION', 'MESA', 'MOSTRADOR'] as OrigenVenta[]).map((origen) => ({
    origen,
    cantidad: ventas.filter((v) => v.origen === origen).length,
  }))

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold text-card-foreground">
          <Wallet size={18} className="text-primary" /> Turno actual
        </h3>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={13} /> Abierto hace {tiempoTranscurrido(turno.creado_en)}
        </span>
      </div>

      <div className="mb-4 rounded-lg bg-primary/10 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Esperado en efectivo
        </p>
        <p className="mt-1 text-3xl font-bold text-foreground">
          {formatoMoneda.format(turno.monto_esperado_efectivo)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Apertura {formatoMoneda.format(turno.monto_apertura)} + efectivo vendido{' '}
          {formatoMoneda.format(turno.total_efectivo)} − gastos{' '}
          {formatoMoneda.format(turno.total_gastos)}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatMini icon={Banknote} etiqueta="Efectivo" valor={formatoMoneda.format(turno.total_efectivo)} />
        <StatMini icon={CreditCard} etiqueta="Tarjeta" valor={formatoMoneda.format(turno.total_tarjeta)} />
        <StatMini icon={Repeat} etiqueta="Transferencia" valor={formatoMoneda.format(turno.total_transferencia)} />
        <StatMini icon={QrCode} etiqueta="QR" valor={formatoMoneda.format(turno.total_qr)} />
        <StatMini icon={Receipt} etiqueta="Gastos" valor={formatoMoneda.format(turno.total_gastos)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ventas por metodo de pago
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="metodo" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  width={40}
                />
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

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ventas por origen · {ventas.length} en total
          </h4>
          <ul className="space-y-2">
            {conteoOrigen.map(({ origen, cantidad }) => {
              const Icono = ICONO_ORIGEN[origen]
              return (
                <li
                  key={origen}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    <Icono size={15} className="text-muted-foreground" />
                    {ETIQUETA_ORIGEN[origen]}
                  </span>
                  <span className="font-medium text-foreground">{cantidad}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

function GastosCard({
  turno,
  gastos,
  puedeCrear,
  puedeEditar,
  puedeEliminar,
  onCambio,
  setError,
}: {
  turno: TurnoCaja
  gastos: Gasto[]
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  onCambio: () => Promise<void> | void
  setError: (msg: string | null) => void
}) {
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState(0)
  const [idEditando, setIdEditando] = useState<number | null>(null)
  const [conceptoEdit, setConceptoEdit] = useState('')
  const [montoEdit, setMontoEdit] = useState(0)
  const [procesando, setProcesando] = useState(false)

  const manejarCrear = async () => {
    if (!concepto || monto <= 0) return
    setError(null)
    setProcesando(true)
    try {
      await crearGasto(concepto, monto)
      setConcepto('')
      setMonto(0)
      await onCambio()
    } catch {
      setError('No se pudo registrar el gasto.')
    } finally {
      setProcesando(false)
    }
  }

  const iniciarEdicion = (gasto: Gasto) => {
    setIdEditando(gasto.id_gasto)
    setConceptoEdit(gasto.concepto)
    setMontoEdit(gasto.monto)
  }

  const guardarEdicion = async (idGasto: number) => {
    setError(null)
    setProcesando(true)
    try {
      await actualizarGasto(idGasto, { concepto: conceptoEdit, monto: montoEdit })
      setIdEditando(null)
      await onCambio()
    } catch {
      setError('No se pudo editar el gasto.')
    } finally {
      setProcesando(false)
    }
  }

  const manejarEliminar = async (idGasto: number) => {
    setError(null)
    setProcesando(true)
    try {
      await eliminarGasto(idGasto)
      await onCambio()
    } catch {
      setError('No se pudo eliminar el gasto.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center justify-between font-semibold text-card-foreground">
        <span className="flex items-center gap-2">
          <Receipt size={18} className="text-primary" /> Gastos del turno
        </span>
        {gastos.length > 0 && (
          <span className="text-sm font-normal text-muted-foreground">
            Total {formatoMoneda.format(turno.total_gastos)}
          </span>
        )}
      </h3>
      <ul className="mb-3 space-y-1">
        {gastos.map((gasto) => (
          <li key={gasto.id_gasto} className="flex items-center justify-between gap-2 text-sm">
            {idEditando === gasto.id_gasto ? (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={conceptoEdit}
                  onChange={(e) => setConceptoEdit(e.target.value)}
                  className="min-w-[8rem] flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number"
                  min={1}
                  value={montoEdit}
                  onChange={(e) => setMontoEdit(Number(e.target.value) || 0)}
                  className="w-28 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => guardarEdicion(gasto.id_gasto)}
                  disabled={procesando}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setIdEditando(null)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <span>{gasto.concepto}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {formatoMoneda.format(gasto.monto)}
                  {puedeEditar && (
                    <button
                      onClick={() => iniciarEdicion(gasto)}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Editar
                    </button>
                  )}
                  {puedeEliminar && (
                    <button
                      onClick={() => manejarEliminar(gasto.id_gasto)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Quitar
                    </button>
                  )}
                </span>
              </>
            )}
          </li>
        ))}
        {gastos.length === 0 && (
          <li className="text-sm text-muted-foreground">Sin gastos todavia.</li>
        )}
      </ul>
      {puedeCrear && turno.estado === 'ABIERTO' && (
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Concepto"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="min-w-[10rem] flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="number"
            min={1}
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value) || 0)}
            className="w-28 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={manejarCrear}
            disabled={!concepto || monto <= 0 || procesando}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Registrar gasto
          </button>
        </div>
      )}
    </div>
  )
}

function CerrarCajaCard({
  turno,
  onCerrada,
  setError,
}: {
  turno: TurnoCaja
  onCerrada: (cerrado: TurnoCaja) => Promise<void> | void
  setError: (msg: string | null) => void
}) {
  const [montoContado, setMontoContado] = useState(turno.monto_esperado_efectivo)
  const [procesando, setProcesando] = useState(false)

  const diferencia = montoContado - turno.monto_esperado_efectivo

  const manejarCerrar = async () => {
    setError(null)
    setProcesando(true)
    try {
      const cerrado = await cerrarTurno(turno.id_turno, montoContado)
      await onCerrada(cerrado)
    } catch {
      setError('No se pudo cerrar la caja.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-card-foreground">
        <Coins size={18} className="text-primary" /> Cerrar caja
      </h3>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Efectivo contado
          </label>
          <input
            type="number"
            min={0}
            value={montoContado}
            onChange={(e) => setMontoContado(Number(e.target.value) || 0)}
            className="w-40 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={manejarCerrar}
          disabled={procesando}
          className="rounded-md border border-destructive px-3 py-1.5 text-sm font-medium text-destructive hover:bg-secondary disabled:opacity-50"
        >
          Cerrar caja
        </button>
      </div>

      <div
        className={`mt-3 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
          diferencia === 0
            ? 'bg-emerald-100 text-emerald-800'
            : diferencia > 0
              ? 'bg-blue-100 text-blue-800'
              : 'bg-red-100 text-red-800'
        }`}
      >
        <Percent size={14} />
        {diferencia === 0 && 'Cuadra exacto con lo esperado.'}
        {diferencia > 0 && `Sobran ${formatoMoneda.format(diferencia)} frente a lo esperado.`}
        {diferencia < 0 && `Faltan ${formatoMoneda.format(Math.abs(diferencia))} frente a lo esperado.`}
      </div>
    </div>
  )
}
