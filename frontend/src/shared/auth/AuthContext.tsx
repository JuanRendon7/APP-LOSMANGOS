import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { TOKEN_STORAGE_KEY, apiClient } from '@/shared/api/client'
import type { UsuarioActual } from './types'

interface AuthContextValue {
  usuario: UsuarioActual | null
  cargando: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  tienePermiso: (recurso: string, accion: string) => boolean
  tieneRol: (...codigos: string[]) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargarUsuarioActual = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setUsuario(null)
      setCargando(false)
      return
    }
    try {
      const { data } = await apiClient.get<UsuarioActual>('/auth/me')
      setUsuario(data)
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      setUsuario(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarUsuarioActual()
  }, [cargarUsuarioActual])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<{ access_token: string }>('/auth/login', {
      email,
      password,
    })
    localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token)
    const { data: usuarioActual } = await apiClient.get<UsuarioActual>('/auth/me')
    setUsuario(usuarioActual)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setUsuario(null)
  }, [])

  const tienePermiso = useCallback(
    (recurso: string, accion: string) => usuario?.permisos.includes(`${recurso}:${accion}`) ?? false,
    [usuario],
  )

  const tieneRol = useCallback(
    (...codigos: string[]) => codigos.some((codigo) => usuario?.roles.includes(codigo)),
    [usuario],
  )

  const value = useMemo(
    () => ({ usuario, cargando, login, logout, tienePermiso, tieneRol }),
    [usuario, cargando, login, logout, tienePermiso, tieneRol],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
