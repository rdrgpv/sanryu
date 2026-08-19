import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sanryu_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Token expirado/inválido numa rota do admin: sem isso, a chamada falhava com 401 e a tela ficava
// parada (sem dado nenhum, sem aviso) em vez de mandar de volta pro login. Não mexe em chamadas
// públicas (só /admin/*) nem na própria tela de login, que trata erro de credencial por conta própria.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';

    if (error.response?.status === 401 && url.startsWith('/admin')) {
      localStorage.removeItem('sanryu_token');
      localStorage.removeItem('sanryu_admin');

      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
