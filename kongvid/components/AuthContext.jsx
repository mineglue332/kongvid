'use client';
// Kongvid - AuthContext: sesi user, token JWT, helper API
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [usedToday, setUsedToday] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('kongvid_token') : null;
    if (!token) { setLoading(false); return; }
    try {
      const r = await fetch(API + '/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
      if (r.ok) {
        const j = await r.json();
        setUser(j.user);
        setUsedToday(j.usedToday);
      } else {
        localStorage.removeItem('kongvid_token');
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const setToken = (t) => { localStorage.setItem('kongvid_token', t); refresh(); };
  const logout = () => { localStorage.removeItem('kongvid_token'); setUser(null); };

  const api = useCallback(async (path, opts = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('kongvid_token') : null;
    const r = await fetch(API + path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(opts.headers || {}),
      },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Terjadi kesalahan'), { status: r.status, data: j });
    return j;
  }, []);

  return <Ctx.Provider value={{ user, loading, usedToday, setToken, logout, refresh, api }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
