import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from './AuthContext'

export function RequiereSesion({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth()

  if (cargando) return null
  if (!usuario) return <Navigate to="/login" replace />

  return <>{children}</>
}

export function RequierePermiso({
  recurso,
  accion,
  children,
}: {
  recurso: string
  accion: string
  children: ReactNode
}) {
  const { tienePermiso, cargando } = useAuth()

  if (cargando) return null
  if (!tienePermiso(recurso, accion)) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">
          No tienes permiso para ver esta seccion.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
