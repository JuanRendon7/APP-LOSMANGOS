interface Props {
  /** 0-1. Que tan visible es la foto de marca detras del velo. */
  opacidadImagen?: number
  /** 0-1. Velo de color encima de la foto para mantener legible el contenido. */
  opacidadVelo?: number
  /** Desenfoque en px. Bajo = la foto (logo en la pared) se reconoce; alto = solo textura. */
  desenfoquePx?: number
  /**
   * 'cover' llena la pantalla de lado a lado (recorta arriba/abajo, nunca a los
   * lados en una pantalla ancha porque la foto es cuadrada -- por eso el logo/texto,
   * que ocupa todo el ancho de la foto, siempre queda visible de lado a lado).
   * 'contain' muestra la foto completa, centrada, con margen vacio garantizado a
   * los lados en pantallas anchas -- util cuando algo (como la tarjeta de login)
   * necesita un area sin contenido de la foto para no tapar el logo.
   */
  ajuste?: 'cover' | 'contain'
}

/**
 * Fondo de marca fijo detras de TODA la app (login + cada pantalla interna): foto de
 * docs/unnamed.jpg (copiada a public/brand-bg.jpg, 1254x1254px). Se monta una sola vez
 * (en AppShell o en LoginPage) con position:fixed, asi que no hace falta repetirlo por
 * pagina. Las tarjetas (`bg-card`) son opacas, asi que el contenido dentro de ellas
 * nunca pierde legibilidad sin importar que tan visible este la foto detras.
 *
 * Usa un <img> real (no CSS background-image) con `object-fit` parametrizable --
 * ver `ajuste` arriba.
 */
export function BrandBackdrop({
  opacidadImagen = 0.4,
  opacidadVelo = 0.5,
  desenfoquePx = 6,
  ajuste = 'cover',
}: Props) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-marca-50">
      <img
        src="/brand-bg.jpg"
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-center ${ajuste === 'contain' ? 'object-contain' : 'object-cover'}`}
        style={{
          opacity: opacidadImagen,
          filter: `blur(${desenfoquePx}px)`,
        }}
      />
      <div className="absolute inset-0 bg-marca-50" style={{ opacity: opacidadVelo }} />
    </div>
  )
}
