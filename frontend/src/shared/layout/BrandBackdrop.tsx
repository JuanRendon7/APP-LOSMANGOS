interface Props {
  /** 0-1. Que tan visible es la foto de marca detras del velo. */
  opacidadImagen?: number
  /** 0-1. Velo de color encima de la foto para mantener legible el contenido. */
  opacidadVelo?: number
  /** Desenfoque en px. Bajo = la foto (logo en la pared) se reconoce; alto = solo textura. */
  desenfoquePx?: number
}

/**
 * Fondo de marca fijo detras de TODA la app (login + cada pantalla interna): foto de
 * docs/unnamed.jpg (copiada a public/brand-bg.jpg, 1254x1254px). Se monta una sola vez
 * (en AppShell o en LoginPage) con position:fixed, asi que no hace falta repetirlo por
 * pagina. Las tarjetas (`bg-card`) son opacas, asi que el contenido dentro de ellas
 * nunca pierde legibilidad sin importar que tan visible este la foto detras.
 *
 * OJO: no usar `background-size: cover` aqui -- en pantallas anchas eso fuerza a
 * escalar la imagen (nativa 1254px) muy por encima de su tamano real y se ve
 * pixelada/borrosa. En su lugar se limita el tamano a como maximo ~1300px (casi 1:1
 * con el original) y se centra; el velo de color rellena el resto sin costura visible.
 */
export function BrandBackdrop({
  opacidadImagen = 0.4,
  opacidadVelo = 0.5,
  desenfoquePx = 6,
}: Props) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-marca-50">
      <div
        className="absolute inset-0 bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/brand-bg.jpg')",
          backgroundSize: 'min(1300px, 105vw)',
          opacity: opacidadImagen,
          filter: `blur(${desenfoquePx}px)`,
        }}
      />
      <div className="absolute inset-0 bg-marca-50" style={{ opacity: opacidadVelo }} />
    </div>
  )
}
