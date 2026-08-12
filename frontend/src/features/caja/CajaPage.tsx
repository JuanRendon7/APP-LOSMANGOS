import {
  Banknote,
  BedDouble,
  Clock,
  Coins,
  CreditCard,
  LayoutGrid,
  Moon,
  Percent,
  QrCode,
  Receipt,
  Repeat,
  ShoppingCart,
  Sun,
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
import { listarProveedores } from '@/features/proveedores/api'
import type { Proveedor } from '@/features/proveedores/types'
import { useAuth } from '@/shared/auth/AuthContext'
import { ESTILO_TONO } from '@/shared/ui/estado'
import {
  abrirTurno,
  actualizarGasto,
  cerrarTurno,
  crearGasto,
  eliminarGasto,
  listarGastos,
  listarVentas,
  mensajeErrorCaja,
  obtenerTurnoActual,
} from './api'
import type { FuentePagoGasto, Gasto, OrigenVenta, TipoTurno, TurnoCaja, Venta } from './types'

const HORA_INICIO_NOCTURNO = 18
const HORA_FIN_NOCTURNO = 6

function estaEnHorarioNocturno(): boolean {
  const hora = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
  )
  return hora >= HORA_INICIO_NOCTURNO || hora < HORA_FIN_NOCTURNO
}

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
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
  return (
    <div className="space-y-8">
      <CajaTurnoSection tipo="DIURNO" titulo="Caja diurna" />
      <CajaTurnoSection tipo="NOCTURNO" titulo="Caja nocturna" />
    </div>
  )
}

function CajaTurnoSection({ tipo, titulo }: { tipo: TipoTurno; titulo: string }) {
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
      const actual = await obtenerTurnoActual(tipo)
      setTurno(actual)
      if (actual) {
        const [gastosDatos, ventasDatos] = await Promise.all([
          listarGastos(actual.id_turno),
          listarVentas({ idTurno: actual.id_turno }),
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
  }, [tipo])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    const id = setInterval(() => forzarTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-foreground">
        {tipo === 'NOCTURNO' ? (
          <Moon size={18} className="text-primary" />
        ) : (
          <Sun size={18} className="text-primary" />
        )}
        {titulo}
      </h2>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {turno === undefined && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {turno !== undefined && !turno && ultimoCierre && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-medium text-foreground">Caja cerrada.</p>
          <p className="text-muted-foreground">
            Esperado: {formatoMoneda.format(ultimoCierre.monto_esperado_efectivo)} ·
            Contado: {formatoMoneda.format(ultimoCierre.monto_cierre_real ?? 0)} ·
            Diferencia: {formatoMoneda.format(ultimoCierre.diferencia ?? 0)}
          </p>
        </div>
      )}
      {turno !== undefined && !turno && (
        <AbrirCajaCard
          tipo={tipo}
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
  tipo,
  puedeAbrir,
  onAbierta,
  setError,
}: {
  tipo: TipoTurno
  puedeAbrir: boolean
  onAbierta: () => Promise<void> | void
  setError: (msg: string | null) => void
}) {
  const [monto, setMonto] = useState(0)
  const [procesando, setProcesando] = useState(false)

  if (!puedeAbrir) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          No hay una caja {tipo === 'NOCTURNO' ? 'nocturna' : 'diurna'} abierta.
        </p>
      </div>
    )
  }

  const fueraDeHorario = tipo === 'NOCTURNO' && !estaEnHorarioNocturno()

  const manejarAbrir = async () => {
    setError(null)
    setProcesando(true)
    try {
      await abrirTurno(monto, tipo)
      await onAbierta()
    } catch (err) {
      setError(mensajeErrorCaja(err, 'No se pudo abrir la caja.'))
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-card-foreground">
        <Wallet size={18} className="text-primary" />
        Abrir {tipo === 'NOCTURNO' ? 'turno nocturno' : 'caja diurna'}
      </h3>
      {fueraDeHorario && (
        <p className="mb-3 text-xs text-muted-foreground">
          El turno nocturno solo se puede abrir entre las 6:00 pm y las 6:00 am.
        </p>
      )}
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
          disabled={procesando || fueraDeHorario}
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
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-card-foreground">
          <Wallet size={18} className="text-primary" /> Turno actual · {turno.nombre_usuario}
        </h3>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={13} /> Abierto hace {tiempoTranscurrido(turno.creado_en)}
        </span>
      </div>

      <div className="mb-4 rounded-lg border-t-2 border-oro-500 bg-primary/10 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Esperado en efectivo
        </p>
        <p className="mt-1 font-serif text-4xl font-bold text-foreground">
          {formatoMoneda.format(turno.monto_esperado_efectivo)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Apertura {formatoMoneda.format(turno.monto_apertura)} + efectivo vendido{' '}
          {formatoMoneda.format(turno.total_efectivo)} − gastos con caja{' '}
          {formatoMoneda.format(turno.total_gastos_caja)}
        </p>
        {turno.total_gastos > turno.total_gastos_caja && (
          <p className="mt-1 text-xs text-muted-foreground">
            + {formatoMoneda.format(turno.total_gastos - turno.total_gastos_caja)} pagados
            con ahorros (no afecta el efectivo esperado)
          </p>
        )}
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
  const [idProveedor, setIdProveedor] = useState('')
  const [fuentePago, setFuentePago] = useState<FuentePagoGasto>('CAJA')
  const [idEditando, setIdEditando] = useState<number | null>(null)
  const [conceptoEdit, setConceptoEdit] = useState('')
  const [montoEdit, setMontoEdit] = useState(0)
  const [idProveedorEdit, setIdProveedorEdit] = useState('')
  const [fuentePagoEdit, setFuentePagoEdit] = useState<FuentePagoGasto>('CAJA')
  const [procesando, setProcesando] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])

  useEffect(() => {
    listarProveedores()
      .then((datos) => setProveedores(datos.filter((p) => p.activo)))
      .catch(() => setProveedores([]))
  }, [])

  const manejarCrear = async () => {
    if (!concepto || monto <= 0) return
    setError(null)
    setProcesando(true)
    try {
      await crearGasto(
        concepto,
        monto,
        turno.id_turno,
        idProveedor ? Number(idProveedor) : undefined,
        fuentePago,
      )
      setConcepto('')
      setMonto(0)
      setIdProveedor('')
      setFuentePago('CAJA')
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
    setIdProveedorEdit(gasto.id_proveedor ? String(gasto.id_proveedor) : '')
    setFuentePagoEdit(gasto.fuente_pago)
  }

  const guardarEdicion = async (idGasto: number) => {
    setError(null)
    setProcesando(true)
    try {
      await actualizarGasto(idGasto, {
        concepto: conceptoEdit,
        monto: montoEdit,
        id_proveedor: idProveedorEdit ? Number(idProveedorEdit) : undefined,
        fuente_pago: fuentePagoEdit,
      })
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
      <h3 className="mb-3 flex items-center justify-between font-serif text-lg font-semibold text-card-foreground">
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
                <select
                  value={idProveedorEdit}
                  onChange={(e) => setIdProveedorEdit(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Sin proveedor</option>
                  {proveedores.map((p) => (
                    <option key={p.id_proveedor} value={p.id_proveedor}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                <select
                  value={fuentePagoEdit}
                  onChange={(e) => setFuentePagoEdit(e.target.value as FuentePagoGasto)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="CAJA">Caja</option>
                  <option value="AHORROS">Ahorros</option>
                </select>
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
                <span>
                  {gasto.concepto}
                  {gasto.nombre_proveedor && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      · {gasto.nombre_proveedor}
                    </span>
                  )}
                  {gasto.fuente_pago === 'AHORROS' && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-info-100 px-1.5 py-0.5 text-[10px] font-medium text-info-800">
                      Ahorros
                    </span>
                  )}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatoHora.format(new Date(gasto.creado_en))}
                  </span>
                </span>
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
          <select
            value={idProveedor}
            onChange={(e) => setIdProveedor(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id_proveedor} value={p.id_proveedor}>
                {p.nombre}
              </option>
            ))}
          </select>
          <select
            value={fuentePago}
            onChange={(e) => setFuentePago(e.target.value as FuentePagoGasto)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="CAJA">Pagado con caja</option>
            <option value="AHORROS">Pagado con ahorros</option>
          </select>
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
      <h3 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-card-foreground">
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
            ? ESTILO_TONO.exito.badge
            : diferencia > 0
              ? ESTILO_TONO.info.badge
              : ESTILO_TONO.peligro.badge
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
