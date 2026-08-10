import { useEffect, useState } from 'react'

type Clave = string | number

interface Props<T> {
  opciones: T[]
  claveSeleccionada: Clave | ''
  obtenerClave: (item: T) => Clave
  obtenerEtiqueta: (item: T) => string
  obtenerDetalle?: (item: T) => string
  onSeleccionar: (item: T) => void
  placeholder?: string
}

export function BuscadorProducto<T>({
  opciones,
  claveSeleccionada,
  obtenerClave,
  obtenerEtiqueta,
  obtenerDetalle,
  onSeleccionar,
  placeholder = 'Busca o selecciona un producto',
}: Props<T>) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (!claveSeleccionada) setTexto('')
  }, [claveSeleccionada])

  const filtradas = texto
    ? opciones.filter((item) => obtenerEtiqueta(item).toLowerCase().includes(texto.toLowerCase()))
    : opciones

  const seleccionar = (item: T) => {
    onSeleccionar(item)
    setTexto(obtenerEtiqueta(item))
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
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {abierto && filtradas.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {filtradas.map((item) => (
            <li key={obtenerClave(item)}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => seleccionar(item)}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-secondary"
              >
                {obtenerEtiqueta(item)}
                {obtenerDetalle && ` · ${obtenerDetalle(item)}`}
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
