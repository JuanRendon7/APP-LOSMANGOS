export type Tono = 'exito' | 'alerta' | 'peligro' | 'info' | 'neutral'

interface EstiloTono {
  marco: string
  badge: string
  chipActivo: string
  banner: string
  punto: string
  texto: string
  anillo: string
}

// Los nombres de clase van completos y literales (no armados con template
// strings) porque Tailwind detecta clases escaneando el texto fuente en busca
// de tokens completos — una clase construida en runtime como `border-${tono}-300`
// nunca aparece como texto literal y Tailwind no la genera.
export const ESTILO_TONO: Record<Tono, EstiloTono> = {
  exito: {
    marco: 'border-exito-300',
    badge: 'bg-exito-100 text-exito-800',
    chipActivo: 'border-exito-500 bg-exito-50 text-exito-800',
    banner: 'border-exito-300 bg-exito-50 text-exito-900',
    punto: 'bg-exito-600',
    texto: 'text-exito-600',
    anillo: 'var(--color-exito-500)',
  },
  alerta: {
    marco: 'border-alerta-300',
    badge: 'bg-alerta-100 text-alerta-800',
    chipActivo: 'border-alerta-500 bg-alerta-50 text-alerta-800',
    banner: 'border-alerta-300 bg-alerta-50 text-alerta-900',
    punto: 'bg-alerta-600',
    texto: 'text-alerta-600',
    anillo: 'var(--color-alerta-500)',
  },
  peligro: {
    marco: 'border-peligro-300',
    badge: 'bg-peligro-100 text-peligro-800',
    chipActivo: 'border-peligro-500 bg-peligro-50 text-peligro-800',
    banner: 'border-peligro-300 bg-peligro-50 text-peligro-900',
    punto: 'bg-peligro-600',
    texto: 'text-peligro-600',
    anillo: 'var(--color-peligro-500)',
  },
  info: {
    marco: 'border-info-300',
    badge: 'bg-info-100 text-info-800',
    chipActivo: 'border-info-500 bg-info-50 text-info-800',
    banner: 'border-info-300 bg-info-50 text-info-900',
    punto: 'bg-info-600',
    texto: 'text-info-600',
    anillo: 'var(--color-info-500)',
  },
  neutral: {
    marco: 'border-marca-300',
    badge: 'bg-marca-200 text-marca-800',
    chipActivo: 'border-marca-400 bg-marca-100 text-marca-800',
    banner: 'border-marca-300 bg-marca-100 text-marca-900',
    punto: 'bg-marca-500',
    texto: 'text-marca-600',
    anillo: 'var(--color-marca-400)',
  },
}
