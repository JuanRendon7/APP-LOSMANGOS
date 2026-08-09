export interface ProductoRestaurante {
  id_producto: number
  nombre: string
  precio_venta: number
  activo: boolean
}

export interface ProductoRestauranteInput {
  nombre: string
  precio_venta: number
  activo?: boolean
}

export interface ProductoBar {
  id_producto: number
  nombre: string
  codigo_barras: string
  precio_venta: number
  stock: number
  umbral_stock_bajo: number
  activo: boolean
  precio_costo: number | null
  margen: number | null
  margen_porcentaje: number | null
}

export interface ProductoBarInput {
  nombre: string
  codigo_barras: string
  precio_costo: number
  precio_venta: number
  stock?: number
  umbral_stock_bajo?: number
  activo?: boolean
}
