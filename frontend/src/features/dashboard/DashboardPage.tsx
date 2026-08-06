import { useAuth } from '@/shared/auth/AuthContext'

export function DashboardPage() {
  const { usuario } = useAuth()

  return (
    <div className="space-y-2">
      <h1 className="text-lg font-semibold text-foreground">
        Bienvenido, {usuario?.nombre}
      </h1>
      <p className="text-sm text-muted-foreground">
        Los modulos de habitaciones, restaurante, bar, caja y reportes se activaran en las
        proximas fases de construccion.
      </p>
    </div>
  )
}
