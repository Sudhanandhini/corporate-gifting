import { Routes, Route, Navigate } from 'react-router-dom';
import OrderWorkflow from './client/OrderWorkflow.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import Login from './admin/Login.jsx';
import RequireAdmin from './admin/RequireAdmin.jsx';
import Dashboard from './admin/Dashboard.jsx';
import Employees from './admin/Employees.jsx';
import Orders from './admin/Orders.jsx';
import Gifts from './admin/Gifts.jsx';
import Reports from './admin/Reports.jsx';

export default function App() {
  return (
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
  );
}
