export interface OpcionSonido {
  id: string
  label: string
  descripcion: string
  reproducir: () => void
}

let contexto: AudioContext | null = null

function obtenerContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext
  if (!Ctor) return null
  if (!contexto) {
    contexto = new Ctor()
  }
  if (contexto.state === 'suspended') {
    contexto.resume().catch(() => {})
  }
  return contexto
}

function tono(
  ctx: AudioContext,
  frecuencia: number,
  inicio: number,
  duracion: number,
  volumen = 0.32,
) {
  const osc = ctx.createOscillator()
  const ganancia = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frecuencia
  const t0 = ctx.currentTime + inicio
  ganancia.gain.setValueAtTime(0, t0)
  ganancia.gain.linearRampToValueAtTime(volumen, t0 + 0.015)
  ganancia.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion)
  osc.connect(ganancia).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + duracion + 0.05)
}

function reproducirCampana() {
  const ctx = obtenerContexto()
  if (!ctx) return
  // Ding-dong repetido dos veces para que se note con ruido de fondo (recepcion/bar).
  tono(ctx, 880, 0, 0.6, 0.34)
  tono(ctx, 1320, 0.03, 0.55, 0.22)
  tono(ctx, 880, 0.55, 0.6, 0.3)
  tono(ctx, 1320, 0.58, 0.55, 0.19)
}

function reproducirTimbre() {
  const ctx = obtenerContexto()
  if (!ctx) return
  // Timbre de mostrador clasico, con el "ding-ding" repetido para alargarlo.
  tono(ctx, 1046, 0, 0.22, 0.36)
  tono(ctx, 1318, 0.2, 0.32, 0.32)
  tono(ctx, 1046, 0.55, 0.22, 0.3)
  tono(ctx, 1318, 0.75, 0.32, 0.26)
}

function reproducirDoble() {
  const ctx = obtenerContexto()
  if (!ctx) return
  tono(ctx, 784, 0, 0.25, 0.34)
  tono(ctx, 784, 0.3, 0.25, 0.34)
}

function reproducirSuave() {
  const ctx = obtenerContexto()
  if (!ctx) return
  tono(ctx, 440, 0, 0.55, 0.18)
}

export const OPCIONES_SONIDO: OpcionSonido[] = [
  {
    id: 'campana',
    label: 'Campana suave',
    descripcion: 'Un tono calido de dos notas. El sonido por defecto.',
    reproducir: reproducirCampana,
  },
  {
    id: 'timbre',
    label: 'Timbre de recepcion',
    descripcion: 'El clasico timbre de mostrador de hotel.',
    reproducir: reproducirTimbre,
  },
  {
    id: 'doble',
    label: 'Aviso doble',
    descripcion: 'Dos pitidos cortos y directos.',
    reproducir: reproducirDoble,
  },
  {
    id: 'suave',
    label: 'Tono grave',
    descripcion: 'Un aviso discreto y bajo, poco intrusivo.',
    reproducir: reproducirSuave,
  },
  {
    id: 'ninguno',
    label: 'Sin sonido',
    descripcion: 'La campana solo se ve, no suena.',
    reproducir: () => {},
  },
]

export function reproducirSonido(id: string) {
  OPCIONES_SONIDO.find((o) => o.id === id)?.reproducir()
}
