import { CircleCheck, Play, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { reproducirSonido, OPCIONES_SONIDO } from '@/shared/notifications/sonidos'
import { useAuth } from '@/shared/auth/AuthContext'
import { actualizarConfiguracion, listarConfiguracion } from './api'

export function ConfiguracionPage() {
  const { tienePermiso } = useAuth()
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState<string | null>(null)
  const [seleccionado, setSeleccionado] = useState('campana')
  const [predeterminado, setPredeterminado] = useState('campana')
  const [guardando, setGuardando] = useState(false)

  const puedeEditar = tienePermiso('CONFIGURACION', 'EDITAR')

  useEffect(() => {
    listarConfiguracion()
      .then((items) => {
        const sonido = items.find((i) => i.clave === 'sonido_notificacion')
        if (sonido) {
          setSeleccionado(sonido.valor)
          setPredeterminado(sonido.valor)
        }
        setError(null)
      })
      .catch(() => setError('No se pudo cargar la configuracion.'))
      .finally(() => setCargando(false))
  }, [])

  const guardar = async () => {
    setError(null)
    setGuardado(null)
    setGuardando(true)
    try {
      await actualizarConfiguracion('sonido_notificacion', seleccionado)
      setPredeterminado(seleccionado)
      setGuardado('Guardado. Este sera el sonido de notificaciones para todo el hotel.')
    } catch {
      setError('No se pudo guardar el sonido predeterminado.')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando configuracion...</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          Notificaciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Elige el sonido que suena cuando llega una notificacion nueva a la campana.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {guardado && <p className="text-sm text-exito-700">{guardado}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPCIONES_SONIDO.map((opcion) => {
          const activo = seleccionado === opcion.id
          const esPredeterminado = predeterminado === opcion.id
          return (
            <div
              key={opcion.id}
              className={`flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors ${
                activo ? 'border-primary ring-1 ring-primary' : 'border-border'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <Volume2 size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{opcion.label}</p>
                  {esPredeterminado && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-mango-100 px-2 py-0.5 text-[10px] font-medium text-mango-800">
                      <CircleCheck size={11} /> Predeterminado
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{opcion.descripcion}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => reproducirSonido(opcion.id)}
                    className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-secondary"
                  >
                    <Play size={12} /> Escuchar
                  </button>
                  {puedeEditar && (
                    <button
                      type="button"
                      onClick={() => setSeleccionado(opcion.id)}
                      disabled={activo}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {activo ? 'Elegido' : 'Elegir'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {puedeEditar ? (
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || seleccionado === predeterminado}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar como predeterminado'}
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">
          Solo un administrador puede cambiar el sonido predeterminado del hotel.
        </p>
      )}
    </div>
  )
}
