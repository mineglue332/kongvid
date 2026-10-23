'use client';
// Kongvid - callback Google OAuth: tukar ?code= menjadi sesi login
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, API } from '@/components/AuthContext';

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { setToken } = useAuth();
  const [err, setErr] = useState('');

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    const saved = sessionStorage.getItem('kongvid_gstate');
    if (!code) { setErr('Kode Google tidak diterima'); return; }
    if (saved && state && saved !== state) { setErr('State OAuth tidak cocok (kemungkinan serangan CSRF)'); return; }
    fetch(API + '/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setToken(j.token);
        router.push('/dashboard');
      })
      .catch((e) => setErr(e.message));
  }, [params]);

  return (
    <div className="center section">
      {err ? <div className="alert alert-error" style={{ maxWidth: 480, margin: '60px auto' }}>{err} — <a href="/login" style={{ textDecoration: 'underline' }}>coba lagi</a></div>
        : <p className="muted">Menyelesaikan login Google…</p>}
    </div>
  );
}

export default function GoogleCallback() {
  return (
    <Suspense fallback={<p className="muted center section">Memuat…</p>}>
      <CallbackInner />
    </Suspense>
  );
}
