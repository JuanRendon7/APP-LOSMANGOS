import { cn } from '@/shared/lib/utils'

interface Props {
  titulo: string
  descripcion: string
  etiquetaConfirmar?: string
  etiquetaCancelar?: string
  tono?: 'peligro' | 'default'
  procesando?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/** Reemplazo estandar de `window.confirm` en toda la app: nunca usar el
 * confirm/alert nativo del navegador, siempre este dialogo. */
export function ConfirmDialog({
  titulo,
  descripcion,
  etiquetaConfirmar = 'Confirmar',
  etiquetaCancelar = 'Cancelar',
  tono = 'default',
  procesando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
        <h3 className="font-serif text-lg font-semibold text-card-foreground">{titulo}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{descripcion}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {etiquetaCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50',
              tono === 'peligro'
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-primary text-primary-foreground',
            )}
          >
            {procesando ? 'Procesando...' : etiquetaConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
