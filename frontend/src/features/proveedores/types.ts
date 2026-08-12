export interface Proveedor {
  id_proveedor: number
  nombre: string
  nit_cedula: string | null
  contacto: string | null
  categoria: string | null
  notas: string | null
  activo: boolean
}

export interface ProveedorInput {
  nombre: string
  nit_cedula?: string
  contacto?: string
  categoria?: string
  notas?: string
  activo?: boolean
}
