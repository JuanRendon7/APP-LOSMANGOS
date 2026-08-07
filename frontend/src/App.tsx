import { Route, Routes } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { CajaPage } from '@/features/caja/CajaPage'
import { VenderPage } from '@/features/caja/VenderPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { HabitacionesPage } from '@/features/hospedaje/HabitacionesPage'
import { ReportesPage } from '@/features/hospedaje/ReportesPage'
import { ProductosBarPage } from '@/features/productos/ProductosBarPage'
import { ProductosRestaurantePage } from '@/features/productos/ProductosRestaurantePage'
import { ComandaPage } from '@/features/restaurante/ComandaPage'
import { MapaMesasPage } from '@/features/restaurante/MapaMesasPage'
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
                <RequierePermiso recurso="VENTAS" accion="VER">
                  <VenderPage />
                </RequierePermiso>
              </AppShell>
            </RequiereSesion>
          }
        />
        <Route
          path="/resumen"
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
          path="/reportes"
          element={
            <RequiereSesion>
              <AppShell>
                <RequierePermiso recurso="RESERVAS" accion="VER">
                  <ReportesPage />
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
        <Route
          path="/productos/restaurante"
          element={
            <RequiereSesion>
              <AppShell>
                <RequierePermiso recurso="PRODUCTOS_RESTAURANTE" accion="VER">
                  <ProductosRestaurantePage />
                </RequierePermiso>
              </AppShell>
            </RequiereSesion>
          }
        />
        <Route
          path="/productos/bar"
          element={
            <RequiereSesion>
              <AppShell>
                <RequierePermiso recurso="PRODUCTOS_BAR" accion="VER">
                  <ProductosBarPage />
                </RequierePermiso>
              </AppShell>
            </RequiereSesion>
          }
        />
        <Route
          path="/restaurante/mesas"
          element={
            <RequiereSesion>
              <AppShell>
                <RequierePermiso recurso="MESAS" accion="VER">
                  <MapaMesasPage />
                </RequierePermiso>
              </AppShell>
            </RequiereSesion>
          }
        />
        <Route
          path="/caja"
          element={
            <RequiereSesion>
              <AppShell>
                <RequierePermiso recurso="CAJA" accion="VER">
                  <CajaPage />
                </RequierePermiso>
              </AppShell>
            </RequiereSesion>
          }
        />
        <Route
          path="/pedidos/:id/comanda"
          element={
            <RequiereSesion>
              <ComandaPage />
            </RequiereSesion>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
