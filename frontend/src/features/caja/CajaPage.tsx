import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/shared/auth/AuthContext'
import {
  abrirTurno,
  actualizarGasto,
  cerrarTurno,
  crearGasto,
  eliminarGasto,
  listarGastos,
  obtenerTurnoActual,
} from './api'
import type { Gasto, TurnoCaja } from './types'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function CajaPage() {
  const { tienePermiso } = useAuth()
  const [turno, setTurno] = useState<TurnoCaja | null | undefined>(undefined)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ultimoCierre, setUltimoCierre] = useState<TurnoCaja | null>(null)

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
        setGastos(await listarGastos(actual.id_turno))
      } else {
        setGastos([])
      }
    } catch {
      setError('No se pudo cargar el estado de la caja.')
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

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
          <ResumenTurnoCard turno={turno} />
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
      <h3 className="mb-3 font-semibold text-card-foreground">Abrir caja</h3>
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

function ResumenTurnoCard({ turno }: { turno: TurnoCaja }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-semibold text-card-foreground">Turno actual</h3>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Metrica etiqueta="Apertura" valor={formatoMoneda.format(turno.monto_apertura)} />
        <Metrica etiqueta="Efectivo" valor={formatoMoneda.format(turno.total_efectivo)} />
        <Metrica etiqueta="Tarjeta" valor={formatoMoneda.format(turno.total_tarjeta)} />
        <Metrica
          etiqueta="Transferencia"
          valor={formatoMoneda.format(turno.total_transferencia)}
        />
        <Metrica etiqueta="QR" valor={formatoMoneda.format(turno.total_qr)} />
        <Metrica etiqueta="Gastos" valor={formatoMoneda.format(turno.total_gastos)} />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">
        Esperado en efectivo: {formatoMoneda.format(turno.monto_esperado_efectivo)}
      </p>
    </div>
  )
}

function Metrica({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="font-medium text-foreground">{valor}</p>
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
      <h3 className="mb-3 font-semibold text-card-foreground">Gastos del turno</h3>
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
      <h3 className="mb-3 font-semibold text-card-foreground">Cerrar caja</h3>
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
    </div>
  )
}
