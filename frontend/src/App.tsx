import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import ClientFormPage from './pages/ClientFormPage'
import ProductsPage from './pages/ProductsPage'
import QuotesPage from './pages/QuotesPage'
import QuoteFormPage from './pages/QuoteFormPage'
import SalesPage from './pages/SalesPage'
import SuppliersPage from './pages/SuppliersPage'
import PurchasesPage from './pages/PurchasesPage'
import InventoryPage from './pages/InventoryPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="clientes/nuevo" element={<ClientFormPage />} />
        <Route path="clientes/:id/editar" element={<ClientFormPage />} />
        <Route path="productos" element={<ProductsPage />} />
        <Route path="cotizaciones" element={<QuotesPage />} />
        <Route path="cotizaciones/nueva" element={<QuoteFormPage />} />
        <Route path="ventas" element={<SalesPage />} />
        <Route path="proveedores" element={<SuppliersPage />} />
        <Route path="compras" element={<PurchasesPage />} />
        <Route path="inventario" element={<InventoryPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
