import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, tokenStore } from '../lib/api.js';
 
const AuthContext = createContext(null);
 
const USER_KEY = 'fh_vms_user';
const cacheUser = (u) => localStorage.setItem(USER_KEY, JSON.stringify(u));
const getCachedUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
};
 
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
 
  const apply = (u, perms) => {
    setUser(u);
    setPermissions(perms || null);
    cacheUser({ user: u, permissions: perms || null });
  };
 
  // Bootstrap: if we have a token, fetch the current user + permissions.
  // Offline (network error) → fall back to the last-known cached session.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => apply(res.data.user, res.data.permissions))
      .catch((err) => {
        if (!err?.response) {
          const cached = getCachedUser();
          if (cached?.user) { setUser(cached.user); setPermissions(cached.permissions || null); }
        } else {
          tokenStore.clear();
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);
 
  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    tokenStore.set(res.data.token);
    apply(res.data.user, res.data.permissions);
    return res.data.user;
  }, []);
 
  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setPermissions(null);
    window.location.assign('/login');
  }, []);
 
  const has = useCallback(
    (moduleKey, action) => {
      if (!user) return false;
      if (user.role === 'ADMIN') return true;
      return !!permissions?.[moduleKey]?.[action];
    },
    [user, permissions]
  );
 
  const value = {
    user,
    permissions,
    loading,
    login,
    logout,
    has,
    isAuthenticated: !!user,
    can: (...roles) => (roles.length === 0 ? true : user && roles.includes(user.role)),
  };
 
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
 
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
