import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080' });

api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('auth-storage');
  if (auth) {
    const parsed = JSON.parse(auth);
    const token = parsed?.state?.user?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const descargarXlsx = async (url: string, nombre: string, params?: Record<string, string>) => {
  const res = await api.get(url, { params, responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nombre;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const descargarReporteVentas = (desde?: string, hasta?: string) =>
  descargarXlsx('/api/reportes/ventas', 'reporte-ventas.xlsx', { ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) });

export const descargarReporteCaja = (desde?: string, hasta?: string) =>
  descargarXlsx('/api/reportes/caja', 'reporte-caja.xlsx', { ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) });

export const descargarReporteCuentaCorriente = (desde?: string, hasta?: string) =>
  descargarXlsx('/api/reportes/cuenta-corriente', 'reporte-cuenta-corriente.xlsx', { ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) });