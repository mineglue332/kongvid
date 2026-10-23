'use client';
// Kongvid - Login (email/password + Google)
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, API } from '@/components/AuthContext';

export function GoogleButton() {
  const [err, setErr] = useState('');
  async function goGoogle() {
    setErr('');
    try {
      const r = await fetch(API + '/api/auth/google/url');
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      sessionStorage.setItem('kongvid_gstate', j.state);
      window.location.href = j.url;
    } catch (e) {
      setErr(e.message);
    }
  }
  return (
    <>
      <button className="btn btn-block" onClick={goGoogle}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 5.1 29.3 3 24 3 12 3 2 13 2 25s10 22 22 22 22-10 22-22c0-1.6-.2-3.1-.4-4.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 5.1 29.3 3 24 3 16.3 3 9.7 7.6 6.3 14.7z"/><path fill="#4CAF50" d="M24 47c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 38.5 26.7 39.5 24 39.5c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 42.3 16.2 47 24 47z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C40.9 35.4 46 30.9 46 25c0-1.6-.2-3.1-.4-4.5z"/></svg>
        Lanjut dengan Google
      </button>
      {err && <div className="alert alert-error">{err}</div>}
    </>
  );
}

export default function LoginPage() {
  const { api, setToken, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) { router.push('/dashboard'); return null; }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const j = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setToken(j.token);
      const intent = localStorage.getItem('kongvid_intent');
      router.push(intent ? '/pricing' : '/dashboard');
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  }

  return (
    <div className="card form-card">
      <h2 style={{ textAlign: 'center' }}>Masuk ke kongvid</h2>
      <GoogleButton />
      <div className="divider">atau dengan email</div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <div className="alert alert-error">{err}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
      </form>
      <p className="center muted small">Belum punya akun? <Link href="/register" style={{ color: 'var(--accent)' }}>Daftar gratis</Link></p>
    </div>
  );
}
