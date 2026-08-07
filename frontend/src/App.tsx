import { Route, Routes } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { HabitacionesPage } from '@/features/hospedaje/HabitacionesPage'
import { TarifarioPage } from '@/features/tarifas/TarifarioPage'
import { AuthProvider } from '@/shared/auth/AuthContext'
import { RequierePermiso, RequiereSesion } from '@/shared/auth/guards'
import { AppShell } from '@/shared/layout/AppShell'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequiereSesion>
              <AppShell>
                <DashboardPage />
              </AppShell>
            </RequiereSesion>
          }
        />
        <Route
          path="/habitaciones"
          element={
            <RequiereSesion>
              <AppShell>
                <RequierePermiso recurso="HABITACIONES" accion="VER">
                  <HabitacionesPage />
                </RequierePermiso>
              </AppShell>
            </RequiereSesion>
          }
        />
        <Route
          path="/tarifario"
          element={
            <RequiereSesion>
              <AppShell>
                <RequierePermiso recurso="TARIFAS" accion="VER">
                  <TarifarioPage />
                </RequierePermiso>
              </AppShell>
            </RequiereSesion>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
