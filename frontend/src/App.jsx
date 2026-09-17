import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import OrderWorkflow from './client/OrderWorkflow.jsx';

// The admin console is a separate bundle from the client order workflow, so
// a client visiting "/" (the page that actually needs a fast first paint)
// doesn't pay for downloading and parsing all of the admin UI up front.
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'));
const Login = lazy(() => import('./admin/Login.jsx'));
const RequireAdmin = lazy(() => import('./admin/RequireAdmin.jsx'));
const Dashboard = lazy(() => import('./admin/Dashboard.jsx'));
const Employees = lazy(() => import('./admin/Employees.jsx'));
const Orders = lazy(() => import('./admin/Orders.jsx'));
const Gifts = lazy(() => import('./admin/Gifts.jsx'));
const Reports = lazy(() => import('./admin/Reports.jsx'));

const PageLoading = () => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
    <span className="spinner" />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* Client-facing order workflow */}
        <Route path="/" element={<OrderWorkflow />} />

        {/* Admin console */}
        <Route path="/admin/login" element={<Login />} />
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="orders" element={<Orders />} />
            <Route path="gifts" element={<Gifts />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
