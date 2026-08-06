import { Route, Routes } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AuthProvider } from '@/shared/auth/AuthContext'
import { RequiereSesion } from '@/shared/auth/guards'
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
      </Routes>
    </AuthProvider>
  )
}
