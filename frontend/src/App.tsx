import { Route, Routes } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { CajaPage } from '@/features/caja/CajaPage'
import { VenderPage } from '@/features/caja/VenderPage'
import { ConfiguracionPage } from '@/features/configuracion/ConfiguracionPage'
import { HabitacionesCatalogoPage } from '@/features/hospedaje/HabitacionesCatalogoPage'
import { HabitacionesPage } from '@/features/hospedaje/HabitacionesPage'
import { LiquidacionesPage } from '@/features/liquidaciones/LiquidacionesPage'
import { ProductosBarPage } from '@/features/productos/ProductosBarPage'
import { ProductosRestaurantePage } from '@/features/productos/ProductosRestaurantePage'
import { ReportesPage } from '@/features/reportes/ReportesPage'
import { ComandaPage } from '@/features/restaurante/ComandaPage'
import { MapaMesasPage } from '@/features/restaurante/MapaMesasPage'
import { TarifarioPage } from '@/features/tarifas/TarifarioPage'
import { UsuariosPage } from '@/features/usuarios/UsuariosPage'
import { AuthProvider } from '@/shared/auth/AuthContext'
import { RequierePermiso, RequiereSesion } from '@/shared/auth/guards'
import { AppShell } from '@/shared/layout/AppShell'
import { TooltipProvider } from '@/shared/ui/Tooltip'

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
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
            path="/habitaciones/catalogo"
            element={
              <RequiereSesion>
                <AppShell>
                  <RequierePermiso recurso="HABITACIONES" accion="VER">
                    <HabitacionesCatalogoPage />
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
                  <RequierePermiso recurso="REPORTES" accion="VER">
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
            path="/usuarios"
            element={
              <RequiereSesion>
                <AppShell>
                  <RequierePermiso recurso="USUARIOS" accion="VER">
                    <UsuariosPage />
                  </RequierePermiso>
                </AppShell>
              </RequiereSesion>
            }
          />
          <Route
            path="/liquidaciones"
            element={
              <RequiereSesion>
                <AppShell>
                  <RequierePermiso recurso="LIQUIDACIONES" accion="VER">
                    <LiquidacionesPage />
                  </RequierePermiso>
                </AppShell>
              </RequiereSesion>
            }
          />
          <Route
            path="/configuracion"
            element={
              <RequiereSesion>
                <AppShell>
                  <RequierePermiso recurso="CONFIGURACION" accion="VER">
                    <ConfiguracionPage />
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
      </TooltipProvider>
    </AuthProvider>
  )
}
