import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sanryu_token');
    const storedAdmin = localStorage.getItem('sanryu_admin');

    if (token && storedAdmin) {
      setAdmin(JSON.parse(storedAdmin));
    }

    setLoading(false);
  }, []);

  async function login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    const { token, admin: adminData } = response.data;

    localStorage.setItem('sanryu_token', token);
    localStorage.setItem('sanryu_admin', JSON.stringify(adminData));
    setAdmin(adminData);

    return adminData;
  }

  function logout() {
    localStorage.removeItem('sanryu_token');
    localStorage.removeItem('sanryu_admin');
    setAdmin(null);
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}
