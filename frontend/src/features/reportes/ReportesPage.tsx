import { BedDouble, Beer, UtensilsCrossed, Wallet, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { BarTab } from './BarTab'
import { CajaTab } from './CajaTab'
import { HotelTab } from './HotelTab'
import { RestauranteTab } from './RestauranteTab'
import { RangoFechas } from './shared'

type Pestana = 'HOTEL' | 'RESTAURANTE' | 'BAR' | 'CAJA'

const PESTANAS: { clave: Pestana; label: string; icon: LucideIcon }[] = [
  { clave: 'HOTEL', label: 'Hotel', icon: BedDouble },
  { clave: 'RESTAURANTE', label: 'Restaurante', icon: UtensilsCrossed },
  { clave: 'BAR', label: 'Bar', icon: Beer },
  { clave: 'CAJA', label: 'Caja', icon: Wallet },
]

export function ReportesPage() {
  const [pestana, setPestana] = useState<Pestana>('HOTEL')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          KPIs, filtros y exportacion por area del negocio.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PESTANAS.map(({ clave, label, icon: Icono }) => (
            <button
              key={clave}
              type="button"
              onClick={() => setPestana(clave)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                pestana === clave
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              <Icono size={16} />
              {label}
            </button>
          ))}
        </div>

        <RangoFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
      </div>

      {pestana === 'HOTEL' && <HotelTab desde={desde} hasta={hasta} />}
      {pestana === 'RESTAURANTE' && <RestauranteTab desde={desde} hasta={hasta} />}
      {pestana === 'BAR' && <BarTab desde={desde} hasta={hasta} />}
      {pestana === 'CAJA' && <CajaTab desde={desde} hasta={hasta} />}
    </div>
  )
}
