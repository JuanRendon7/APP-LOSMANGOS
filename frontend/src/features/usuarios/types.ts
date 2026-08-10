export type CodigoRol = 'ADMINISTRADOR' | 'EMPLEADO' | 'COCINA'

export interface Usuario {
  id_usuario: number
  nombre: string
  cedula: string
  celular: string
  email: string
  activo: boolean
  roles: string[]
}

export interface UsuarioCreateInput {
  nombre: string
  cedula: string
  celular: string
  email: string
  password: string
  roles: string[]
}

export interface UsuarioUpdateInput {
  nombre?: string
  cedula?: string
  celular?: string
  activo?: boolean
  roles?: string[]
  password?: string
}
