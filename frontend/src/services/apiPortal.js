import axios from 'axios';

// Conexão da área do aluno/responsável — sessão própria, separada do login do admin/sensei (outro
// token no navegador), pra um não derrubar nem "vazar" para o outro.
export const CHAVE_TOKEN_PORTAL = 'sanryu_portal_token';

const apiPortal = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/portal`,
});

apiPortal.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(CHAVE_TOKEN_PORTAL);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    // Navegador sem localStorage (modo privado restrito): segue sem sessão.
  }
  return config;
});

// Sessão expirada: volta pra tela de entrada.
apiPortal.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      try {
        localStorage.removeItem(CHAVE_TOKEN_PORTAL);
      } catch (err) {
        // ignora
      }
      if (!window.location.pathname.startsWith('/portal/entrar')) window.location.href = '/portal/entrar';
    }
    return Promise.reject(error);
  }
);

export default apiPortal;
