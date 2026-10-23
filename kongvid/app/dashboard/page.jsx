'use client';
// Kongvid - Dashboard: riwayat download, sisa limit, upgrade plan
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, API } from '@/components/AuthContext';
import { fmtSize } from '@/components/Downloader';

const KIND_LABEL = { video: '⬇️ Video', mp3: '🎵 MP3', subtitle: '💬 Subtitle', compress: '🗄️ Kompres' };

export default function Dashboard() {
  const { user, loading, api } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) api('/api/history').then(setData).catch((e) => console.error(e));
  }, [user, api]);

  if (loading || !user) return <p className="muted mt">Memuat…</p>;

  const remaining = Math.max(0, data.dailyLimit - data.usedToday);
  const pct = Math.min(100, (data.usedToday / data.dailyLimit) * 100);

  return (
    <section className="section">
      <h1 style={{ fontSize: 28 }}>👋 Halo, {user.name}</h1>
      <p className="sub">Paket kamu: <span className={`badge badge-${user.plan}`}>{user.planName}</span> · Member sejak {new Date(user.createdAt).toLocaleDateString('id-ID')}</p>

      <div className="grid grid-4 mb">
        <div className="card stat">
          <div className="num">{remaining}</div>
          <div className="lbl">Sisa download hari ini</div>
          <div className="progress" style={{ marginTop: 10 }}><div style={{ width: pct + '%' }} /></div>
          <div className="small muted">{data.usedToday}/{data.dailyLimit} terpakai</div>
        </div>
        <div className="card stat">
          <div className="num">{user.maxQuality}p</div>
          <div className="lbl">Kualitas maksimal paketmu</div>
        </div>
        <div className="card stat">
          <div className="num">{data.items.length}</div>
          <div className="lbl">Total aktivitas tersimpan</div>
        </div>
        <div className="card stat">
          <div className="num">{user.watermark ? 'Ada' : 'Tidak'}</div>
          <div className="lbl">Watermark pada hasil</div>
        </div>
      </div>

      {user.plan === 'free' && (
        <div className="alert alert-info mb">
          💎 Upgrade ke <b>Premium</b> untuk 1080p, MP3 converter, tanpa watermark &amp; tanpa iklan — mulai Rp49.000/bln.{' '}
          <Link href="/pricing" style={{ color: 'var(--accent)', fontWeight: 700 }}>Upgrade sekarang →</Link>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>📜 Riwayat Download</h2>
        {data.items.length === 0 ? (
          <p className="muted">Belum ada aktivitas. Mulai dari <Link href="/" style={{ color: 'var(--accent)' }}>Home</Link>.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>Waktu</th><th>Jenis</th><th>URL</th><th>Kualitas</th><th>File</th><th>Ukuran</th></tr>
              </thead>
              <tbody>
                {data.items.map((h, i) => (
                  <tr key={i}>
                    <td className="muted small">{new Date(h.at).toLocaleString('id-ID')}</td>
                    <td>{KIND_LABEL[h.kind] || h.kind}</td>
                    <td className="small" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.url}</td>
                    <td>{h.quality ? h.quality + 'p' : '-'}</td>
                    <td className="small">{h.file}</td>
                    <td>{fmtSize(h.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt center">
        <Link href="/pricing"><button className="btn btn-primary">⬆️ Upgrade Plan</button></Link>
      </div>
    </section>
  );
}
