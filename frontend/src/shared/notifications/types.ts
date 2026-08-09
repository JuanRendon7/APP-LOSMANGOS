export type NivelNotificacion = 'info' | 'warning' | 'critical'

export interface Notificacion {
  id: string
  nivel: NivelNotificacion
  titulo: string
  descripcion: string
  enlace: string
}
