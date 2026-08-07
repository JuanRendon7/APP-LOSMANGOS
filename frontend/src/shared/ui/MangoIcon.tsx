interface Props {
  className?: string
  size?: number
}

/**
 * Icono de marca dibujado a mano (no la foto de docs/unnamed.jpg, que es un
 * mockup de pared y no escala bien a tamanos pequenos): dos hojas + mango con
 * linea de brillo interna, mismo espiritu del logo "Los Mangos". Las hojas
 * van en verde de marca; el fruto hereda currentColor de quien lo use.
 */
export function MangoIcon({ className, size = 24 }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M24,12 Q16,3 8,7 Q13,15 24,12 Z" className="stroke-mango-500" />
      <path d="M24,12 Q32,3 40,7 Q35,15 24,12 Z" className="stroke-mango-500" />
      <path d="M24,12 C24,14 24,15 24,16" />
      <path d="M24,16 C33,16 38,24 36,32 C34,40 29,44 22,43 C15,42 10,36 11,28 C12,20 17,16 24,16 Z" />
      <path d="M29,19 C33,24 33,32 28,39" strokeWidth={1.75} />
    </svg>
  )
}
