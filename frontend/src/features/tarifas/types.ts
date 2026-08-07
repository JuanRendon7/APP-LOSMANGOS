export interface Temporada {
  id_temporada: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  precio_noche: number
  activa: boolean
}

export interface TemporadaInput {
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  precio_noche: number
  activa: boolean
}
