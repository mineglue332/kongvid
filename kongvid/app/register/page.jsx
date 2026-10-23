'use client';
// Kongvid - Register (email/password + Google)
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { GoogleButton } from '../login/page';

export default function RegisterPage() {
  const { api, setToken, user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) { router.push('/dashboard'); return null; }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const j = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      setToken(j.token);
      router.push('/dashboard');
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  }

  return (
    <div className="card form-card">
      <h2 style={{ textAlign: 'center' }}>Buat akun kongvid</h2>
      <GoogleButton />
      <div className="divider">atau dengan email</div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (min. 6 karakter)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {err && <div className="alert alert-error">{err}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Memproses…' : 'Daftar Gratis'}</button>
      </form>
      <p className="center muted small">Sudah punya akun? <Link href="/login" style={{ color: 'var(--accent)' }}>Masuk</Link></p>
    </div>
  );
}
