import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { api, adminAuth } from '../lib/api.js';

export default function RequireAdmin() {
  const [status, setStatus] = useState('checking'); // checking | ok | fail
  const location = useLocation();

  useEffect(() => {
    if (!adminAuth.getToken()) { setStatus('fail'); return; }
    api.adminSession().then(() => setStatus('ok')).catch(() => setStatus('fail'));
  }, []);

  if (status === 'checking') return null;
  if (status === 'fail') return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}
