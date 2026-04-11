import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const token = localStorage.getItem('govqueue_token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.user);
        })
        .catch(() => {
          localStorage.removeItem('govqueue_token');
          localStorage.removeItem('govqueue_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, role = 'user') => {
    const endpoint = role === 'admin' ? '/auth/admin/login' : '/auth/user/login';
    const res = await api.post(endpoint, { email, password });
    localStorage.setItem('govqueue_token', res.data.token);
    localStorage.setItem('govqueue_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const signup = async (data, role = 'user') => {
    const endpoint = role === 'admin' ? '/auth/admin/signup' : '/auth/user/signup';
    const res = await api.post(endpoint, data);
    localStorage.setItem('govqueue_token', res.data.token);
    localStorage.setItem('govqueue_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    localStorage.removeItem('govqueue_token');
    localStorage.removeItem('govqueue_user');
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isUser = user?.role === 'user';

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, isAuthenticated, isAdmin, isUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
