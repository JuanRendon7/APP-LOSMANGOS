import { Barcode, Wallet } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { listarProductosBar, listarProductosRestaurante } from '@/features/productos/api'
import type { ProductoBar, ProductoRestaurante } from '@/features/productos/types'
import { useAuth } from '@/shared/auth/AuthContext'
import {
  abrirTurno,
  deshacerUltimaVenta,
  listarVentas,
  mensajeErrorCaja,
  obtenerTurnoActual,
  ventaMostrador,
} from './api'
import type {
  MetodoPago,
  OrigenVenta,
  OrigenVentaMostrador,
  TurnoCaja,
  Venta,
  VentaMostradorItemInput,
} from './types'

const STOCK_BAJO_UMBRAL = 5

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const METODOS: MetodoPago[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR']
const ETIQUETA_METODO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  QR: 'QR',
}

const CONTEXTO_ORIGEN: Record<OrigenVenta, string> = {
  HABITACION: 'Cobro de habitacion',
  MESA: 'Cobro de mesa',
  MOSTRADOR: 'Venta directa',
}

const formatoHora = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' })

interface ItemCarrito extends VentaMostradorItemInput {
  nombre: string
  precio_venta: number
}

export function VenderPage() {
  const { usuario, tienePermiso } = useAuth()
  const navigate = useNavigate()
  const [turno, setTurno] = useState<TurnoCaja | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const puedeAbrir = tienePermiso('CAJA', 'CREAR')
  const puedeVender = tienePermiso('VENTAS', 'CREAR')
  const puedeCerrar = tienePermiso('CAJA', 'CERRAR')
  const primerNombre = usuario?.nombre.split(' ')[0]

  const cargarTurno = useCallback(async () => {
    try {
      setTurno(await obtenerTurnoActual())
    } catch {
      setError('No se pudo cargar el estado de la caja.')
    }
  }, [])

  useEffect(() => {
    cargarTurno()
  }, [cargarTurno])

  if (turno === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>
  }

  if (!turno) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            Bienvenido de nuevo, {primerNombre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Abre tu caja para comenzar a vender.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="w-full max-w-sm">
          <AbrirCajaInline puedeAbrir={puedeAbrir} onAbierta={cargarTurno} setError={setError} />
        </div>
      </div>
    )
  }

  if (!puedeVender) {
    return <p className="text-sm text-muted-foreground">No tienes permiso para vender.</p>
  }

  const cajaAbiertaPorOtro = turno.nombre_usuario !== usuario?.nombre

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            Bienvenido de nuevo, {primerNombre}
          </h1>
          <p className="text-sm text-muted-foreground">
            Turno abierto con {formatoMoneda.format(turno.monto_apertura)} en caja
            {cajaAbiertaPorOtro && ` · abierta por ${turno.nombre_usuario}`}.
          </p>
        </div>
        {puedeCerrar && (
          <button
            onClick={() => navigate('/caja')}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            Cerrar caja →
          </button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <VentaMostrador turno={turno} onCambio={cargarTurno} setError={setError} />
    </div>
  )
}

function AbrirCajaInline({
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
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-8 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-primary">
          <Wallet size={26} />
        </div>
        <p className="text-sm text-muted-foreground">
          No hay una caja abierta. Pide a un administrador que la abra.
        </p>
      </div>
    )
  }

  const manejarAbrir = async () => {
    setError(null)
    setProcesando(true)
    try {
      await abrirTurno(monto)
      await onAbierta()
    } catch (err) {
      setError(mensajeErrorCaja(err, 'No se pudo abrir la caja.'))
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-8 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Wallet size={26} />
      </div>
      <div>
        <h2 className="font-serif text-xl font-semibold text-foreground">Abrir la caja del hotel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hay un solo cajon compartido. Registra el efectivo con el que arranca el turno.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <label className="text-left text-xs font-medium text-muted-foreground">
          Efectivo inicial
        </label>
        <input
          type="number"
          min={0}
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value) || 0)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={manejarAbrir}
          disabled={procesando}
          className="mt-1 w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {procesando ? 'Abriendo...' : 'Abrir caja'}
        </button>
      </div>
    </div>
  )
}

function VentaMostrador({
  turno,
  onCambio,
  setError,
}: {
  turno: TurnoCaja
  onCambio: () => Promise<void> | void
  setError: (msg: string | null) => void
}) {
  const { tienePermiso } = useAuth()
  const idTurno = turno.id_turno
  const [productosBar, setProductosBar] = useState<ProductoBar[]>([])
  const [productosRestaurante, setProductosRestaurante] = useState<ProductoRestaurante[]>([])
  const [origen, setOrigen] = useState<OrigenVentaMostrador>('BAR')
  const [idProducto, setIdProducto] = useState<number | ''>('')
  const [cantidad, setCantidad] = useState(1)
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO')
  const [procesando, setProcesando] = useState(false)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)
  const [codigoBarras, setCodigoBarras] = useState('')
  const [errorEscaneo, setErrorEscaneo] = useState<string | null>(null)
  const [avisoStock, setAvisoStock] = useState<string | null>(null)
  const [movimientos, setMovimientos] = useState<Venta[]>([])
  const [deshaciendo, setDeshaciendo] = useState(false)
  const inputBarcodeRef = useRef<HTMLInputElement>(null)

  const puedeDeshacer = tienePermiso('VENTAS', 'EDITAR')

  const cargarProductos = useCallback(async () => {
    const [bar, restaurante] = await Promise.all([
      listarProductosBar(),
      listarProductosRestaurante(),
    ])
    setProductosBar(bar.filter((p) => p.activo))
    setProductosRestaurante(restaurante.filter((p) => p.activo))
  }, [])

  const cargarMovimientos = useCallback(async () => {
    try {
      const datos = await listarVentas({ idTurno })
      setMovimientos(datos)
    } catch {
      setError('No se pudieron cargar los movimientos del turno.')
    }
  }, [idTurno, setError])

  useEffect(() => {
    cargarProductos()
  }, [cargarProductos])

  useEffect(() => {
    cargarMovimientos()
  }, [cargarMovimientos])

  useEffect(() => {
    inputBarcodeRef.current?.focus()
  }, [])

  const opciones = origen === 'BAR' ? productosBar : productosRestaurante
  const total = carrito.reduce((acc, item) => acc + item.cantidad * item.precio_venta, 0)

  const agregarProducto = (
    origenProducto: OrigenVentaMostrador,
    producto: ProductoBar | ProductoRestaurante,
    cantidadAgregar: number,
  ) => {
    setCarrito((prev) => {
      const indiceExistente = prev.findIndex(
        (item) => item.origen === origenProducto && item.id_producto === producto.id_producto,
      )
      const yaEnCarrito =
        indiceExistente >= 0 ? prev[indiceExistente].cantidad : 0
      if (origenProducto === 'BAR' && 'stock' in producto) {
        const restante = producto.stock - yaEnCarrito - cantidadAgregar
        setAvisoStock(
          restante <= STOCK_BAJO_UMBRAL
            ? `Quedan pocas unidades de "${producto.nombre}" (${Math.max(restante, 0)}).`
            : null,
        )
      }
      if (indiceExistente >= 0) {
        const copia = [...prev]
        copia[indiceExistente] = {
          ...copia[indiceExistente],
          cantidad: copia[indiceExistente].cantidad + cantidadAgregar,
        }
        return copia
      }
      return [
        ...prev,
        {
          origen: origenProducto,
          id_producto: producto.id_producto,
          cantidad: cantidadAgregar,
          nombre: producto.nombre,
          precio_venta: producto.precio_venta,
        },
      ]
    })
  }

  const manejarEscaneo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const valor = codigoBarras.trim()
    if (!valor) return
    const producto = productosBar.find((p) => p.codigo_barras === valor)
    if (!producto) {
      setErrorEscaneo(`Codigo no encontrado: ${valor}`)
    } else {
      setErrorEscaneo(null)
      agregarProducto('BAR', producto, 1)
    }
    setCodigoBarras('')
    inputBarcodeRef.current?.focus()
  }

  const agregarAlCarrito = () => {
    if (!idProducto) return
    const producto = opciones.find((p) => p.id_producto === idProducto)
    if (!producto) return
    agregarProducto(origen, producto, cantidad)
    setIdProducto('')
    setCantidad(1)
  }

  const quitarDelCarrito = (indice: number) => {
    setCarrito((prev) => prev.filter((_, i) => i !== indice))
  }

  const manejarCobrar = async () => {
    if (carrito.length === 0) return
    setError(null)
    setConfirmacion(null)
    setProcesando(true)
    try {
      await ventaMostrador(
        carrito.map(({ origen, id_producto, cantidad }) => ({
          origen,
          id_producto,
          cantidad,
        })),
        metodoPago,
      )
      setCarrito([])
      setAvisoStock(null)
      setConfirmacion(`Venta cobrada: ${formatoMoneda.format(total)}`)
      await Promise.all([cargarMovimientos(), cargarProductos(), onCambio()])
    } catch {
      setError('No se pudo registrar la venta.')
    } finally {
      setProcesando(false)
    }
  }

  const manejarDeshacer = async () => {
    setError(null)
    setConfirmacion(null)
    setDeshaciendo(true)
    try {
      await deshacerUltimaVenta()
      await Promise.all([cargarMovimientos(), cargarProductos(), onCambio()])
    } catch {
      setError('No se pudo deshacer la ultima venta.')
    } finally {
      setDeshaciendo(false)
    }
  }

  const totalVendidoTurno =
    turno.total_efectivo + turno.total_tarjeta + turno.total_transferencia + turno.total_qr
  const ultimoMovimiento = movimientos[0]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-serif text-lg font-semibold text-card-foreground">Nueva venta</h2>

          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Escanear codigo de barras
          </label>
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
            <Barcode size={20} className="shrink-0 text-muted-foreground" />
            <input
              ref={inputBarcodeRef}
              type="text"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onKeyDown={manejarEscaneo}
              placeholder="Escanea o escribe el codigo y presiona Enter"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          {errorEscaneo && <p className="mt-1 text-xs text-destructive">{errorEscaneo}</p>}

          <div className="my-3 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            o selecciona manualmente
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={origen}
              onChange={(e) => {
                setOrigen(e.target.value as OrigenVentaMostrador)
                setIdProducto('')
              }}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="BAR">Bar</option>
              <option value="RESTAURANTE">Restaurante</option>
            </select>
            <BuscadorProducto
              opciones={opciones}
              idSeleccionado={idProducto}
              onSeleccionar={(producto) => setIdProducto(producto.id_producto)}
            />
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value) || 1)}
              className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={agregarAlCarrito}
              disabled={!idProducto}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
          {avisoStock && (
            <p className="mt-2 text-xs font-medium text-alerta-600">{avisoStock}</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-serif text-lg font-semibold text-card-foreground">Carrito</h2>
          {confirmacion && (
            <p className="mb-2 rounded-md bg-primary/10 px-2 py-1 text-sm text-primary">
              {confirmacion}
            </p>
          )}
          <ul className="mb-3 space-y-1">
            {carrito.map((item, indice) => (
              <li key={indice} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {item.cantidad} × {item.nombre}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {formatoMoneda.format(item.cantidad * item.precio_venta)}
                  <button
                    onClick={() => quitarDelCarrito(indice)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Quitar
                  </button>
                </span>
              </li>
            ))}
            {carrito.length === 0 && (
              <li className="text-sm text-muted-foreground">Carrito vacio.</li>
            )}
          </ul>

          <div className="space-y-2">
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {METODOS.map((metodo) => (
                <option key={metodo} value={metodo}>
                  {ETIQUETA_METODO[metodo]}
                </option>
              ))}
            </select>
            <button
              onClick={manejarCobrar}
              disabled={carrito.length === 0 || procesando}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Cobrar {formatoMoneda.format(total)}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg font-semibold text-card-foreground">Movimientos de este turno</h2>
            <p className="text-xs text-muted-foreground">
              Total vendido: {formatoMoneda.format(totalVendidoTurno)}
            </p>
          </div>
          {puedeDeshacer && ultimoMovimiento?.origen === 'MOSTRADOR' && (
            <button
              onClick={manejarDeshacer}
              disabled={deshaciendo}
              className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
            >
              {deshaciendo ? 'Deshaciendo...' : 'Deshacer ultima venta'}
            </button>
          )}
        </div>
        <ul className="space-y-1 text-sm">
          {movimientos.map((venta) => {
            const contexto = CONTEXTO_ORIGEN[venta.origen]
            const resumenProductos =
              venta.items.length > 0
                ? venta.items.map((item) => `${item.cantidad}× ${item.nombre_producto}`).join(', ')
                : null
            return (
              <li key={venta.id_venta} className="rounded-md px-2 py-1.5 odd:bg-muted/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">
                    {resumenProductos ?? contexto}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    {ETIQUETA_METODO[venta.metodo_pago]}
                    <span className="text-sm font-medium text-foreground">
                      {formatoMoneda.format(venta.monto)}
                    </span>
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {formatoHora.format(new Date(venta.creado_en))} · {contexto}
                </p>
              </li>
            )
          })}
          {movimientos.length === 0 && (
            <li className="text-sm text-muted-foreground">Sin movimientos todavia.</li>
          )}
        </ul>
      </div>
    </div>
  )
}

function BuscadorProducto({
  opciones,
  idSeleccionado,
  onSeleccionar,
}: {
  opciones: (ProductoBar | ProductoRestaurante)[]
  idSeleccionado: number | ''
  onSeleccionar: (producto: ProductoBar | ProductoRestaurante) => void
}) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (!idSeleccionado) setTexto('')
  }, [idSeleccionado])

  const filtradas = texto
    ? opciones.filter((p) => p.nombre.toLowerCase().includes(texto.toLowerCase()))
    : opciones

  const seleccionar = (producto: ProductoBar | ProductoRestaurante) => {
    onSeleccionar(producto)
    setTexto(producto.nombre)
    setAbierto(false)
  }

  return (
    <div className="relative min-w-[12rem] flex-1">
      <input
        type="text"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAbierto(true)
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && filtradas.length > 0) {
            e.preventDefault()
            seleccionar(filtradas[0])
          }
        }}
        placeholder="Busca o selecciona un producto"
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {abierto && filtradas.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {filtradas.map((producto) => (
            <li key={producto.id_producto}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => seleccionar(producto)}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-secondary"
              >
                {producto.nombre} · {formatoMoneda.format(producto.precio_venta)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {abierto && texto && filtradas.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-lg">
          Sin resultados
        </div>
      )}
    </div>
  )
}
