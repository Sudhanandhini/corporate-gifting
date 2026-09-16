const BASE = import.meta.env.VITE_API_BASE || ''; // empty -> uses Vite proxy
const TOKEN_KEY = 'cg_admin_token';

export const assetUrl = (p) => (p ? `${BASE}${p}` : '');

export const adminAuth = {
  getToken: () => localStorage.getItem(TOKEN_KEY) || '',
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(path, options = {}) {
  const token = adminAuth.getToken();
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${BASE}/api${path}`, {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) adminAuth.clear();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // auth
  requestOtp: (email) =>
    request('/auth/request-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyOtp: (email, code) =>
    request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, code }) }),
  adminLogin: (username, password) =>
    request('/auth/admin-login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  adminSession: () => request('/auth/admin-session'),

  // gifts
  gifts: () => request('/gifts'),
  adminGifts: (search = '') => request(`/gifts/admin?search=${encodeURIComponent(search)}`),
  createGift: (formData) => request('/gifts', { method: 'POST', body: formData }),
  updateGift: (id, formData) => request(`/gifts/${id}`, { method: 'PUT', body: formData }),
  deleteGift: (id) => request(`/gifts/${id}`, { method: 'DELETE' }),
  reorderGifts: (order) => request('/gifts/reorder', { method: 'PUT', body: JSON.stringify({ order }) }),

  // orders
  createOrder: (payload) =>
    request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  orders: ({ search = '', status = '', dateFrom = '', dateTo = '', deleted = '', page = 1 } = {}) =>
    request(`/orders?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}&deleted=${encodeURIComponent(deleted)}&page=${encodeURIComponent(page)}`),
  order: (id) => request(`/orders/${id}`),
  updateOrder: (id, status) =>
    request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),
  restoreOrder: (id) => request(`/orders/${id}/restore`, { method: 'POST' }),
  permanentlyDeleteOrder: (id) => request(`/orders/${id}/permanent`, { method: 'DELETE' }),

  // employees
  employees: (search = '', page = 1) => request(`/employees?search=${encodeURIComponent(search)}&page=${encodeURIComponent(page)}`),
  createEmployee: (p) =>
    request('/employees', { method: 'POST', body: JSON.stringify(p) }),
  updateEmployee: (id, p) =>
    request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
  exportEmployees: (search = '') =>
    request('/employees/export', { method: 'POST', body: JSON.stringify({ search }) }),

  // dashboard
  stats: () => request('/dashboard/stats'),

  // reports
  reports: (page = 1) => request(`/reports?page=${encodeURIComponent(page)}`),
  exportOrders: (filters) =>
    request('/reports/export', { method: 'POST', body: JSON.stringify(filters) }),
  deleteReport: (id) => request(`/reports/${id}`, { method: 'DELETE' }),
};
