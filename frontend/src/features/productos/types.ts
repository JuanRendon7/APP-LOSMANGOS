export type CategoriaProductoRestaurante = 'DESAYUNO' | 'ALMUERZO' | 'CENA' | 'ADICIONALES'

export const CATEGORIAS_PRODUCTO_RESTAURANTE: CategoriaProductoRestaurante[] = [
  'DESAYUNO',
  'ALMUERZO',
  'CENA',
  'ADICIONALES',
]

export const ETIQUETA_CATEGORIA_RESTAURANTE: Record<CategoriaProductoRestaurante, string> = {
  DESAYUNO: 'Desayuno',
  ALMUERZO: 'Almuerzo',
  CENA: 'Cena',
  ADICIONALES: 'Adicionales',
}

export interface ProductoRestaurante {
  id_producto: number
  nombre: string
  categoria: CategoriaProductoRestaurante
  precio_venta: number
  activo: boolean
}

export interface ProductoRestauranteInput {
  nombre: string
  categoria?: CategoriaProductoRestaurante
  precio_venta: number
  activo?: boolean
}

export interface ProductoBar {
  id_producto: number
  nombre: string
  codigo_barras: string | null
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
  codigo_barras?: string
  precio_costo: number
  precio_venta: number
  stock?: number
  umbral_stock_bajo?: number
  activo?: boolean
}
