import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: API_BASE, timeout: 10000 });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('coldchain_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(response => response, error => {
  const url = error.config?.url || '';
  if (error.response?.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
    localStorage.removeItem('coldchain_token'); localStorage.removeItem('coldchain_user');
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }
  return Promise.reject(error);
});
export const authApi = { login: payload => api.post('/auth/login', payload), register: payload => api.post('/auth/register', payload) };
export const dashboardApi = () => api.get('/dashboard/summary');
export const shipmentsApi = () => api.get('/shipments');
export const shipmentApi = id => api.get(`/shipments/${id}`);
export const createShipmentApi = payload => api.post('/shipments', payload);
export const readingsApi = (params = {}) => api.get('/sensor/readings', { params });
export const alertsApi = () => api.get('/alerts');
export const resolveAlertApi = id => api.put(`/alerts/${id}/resolve`);
export const vehiclesApi = () => api.get('/vehicles');
export const createVehicleApi = payload => api.post('/vehicles', payload);
export const warehousesApi = () => api.get('/warehouses');
export const createWarehouseApi = payload => api.post('/warehouses', payload);
export const updateWarehouseApi = (id, payload) => api.patch(`/warehouses/${id}`, payload);
export const deleteWarehouseApi = id => api.delete(`/warehouses/${id}`);
export const adminUsersApi = () => api.get('/admin/users');
export const createAdminUserApi = payload => api.post('/admin/users', payload);
export const updateAdminUserApi = (id, payload) => api.patch(`/admin/users/${id}`, payload);
export const resetAdminPasswordApi = (id, password) => api.put(`/admin/users/${id}/password`, { password });
export const auditLogsApi = (params = {}) => api.get('/admin/audit-logs', { params });
export default api;
