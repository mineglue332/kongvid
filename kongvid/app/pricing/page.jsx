'use client';
// Kongvid - halaman Pricing: Free vs Premium vs Pro + pembayaran Midtrans
import { useState } from 'react';
import { useAuth, API } from '@/components/AuthContext';
import { PLANS, formatIDR } from '@/lib/plans.mjs';

export default function PricingPage() {
  const { user, api, setToken } = useAuth();
  const [cycle, setCycle] = useState('monthly');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function buy(planId) {
    setMsg(''); 
    if (!user) {
      // arahkan login dulu, simpan intent
      localStorage.setItem('kongvid_intent', planId + '_' + cycle);
      window.location.href = '/login';
      return;
    }
    if (user.plan === planId) { setMsg(`Kamu sudah memakai paket ${PLANS[planId].name}.`); return; }
    setBusy(true);
    try {
      const itemId = `${planId}_${cycle}`;
      const r = await api('/api/payment/create-subscription', { method: 'POST', body: JSON.stringify({ itemId }) });
      if (r.simulated) {
        // mode dev: aktifkan langsung untuk uji coba
        const ok = window.confirm(r.message + '\n\nKlik OK untuk simulasi pembayaran berhasil.');
        if (ok) {
          const p = await api('/api/payment/pay', { method: 'POST', body: JSON.stringify({ token: r.token }) });
          setMsg(`✅ Paket ${PLANS[p.plan].name} aktif! (simulasi — pasang MIDTRANS_SERVER_KEY di .env untuk pembayaran asli)`);
          setTimeout(() => window.location.reload(), 1200);
        }
      } else {
        // Midtrans asli: buka Snap/accept dengan subscription token
        setMsg('Pembayaran dibuat di Midtrans. Selesaikan di halaman Midtrans, lalu refresh. Token: ' + r.token);
      }
    } catch (e) {
      setMsg('❌ ' + e.message);
    }
    setBusy(false);
  }

  const rows = [
    ['Kualitas download maks', (p) => p.maxQuality >= 4320 ? '4K/8K' : p.maxQuality + 'p'],
    ['Limit download / hari', (p) => p.dailyLimit + 'x'],
    ['Tanpa watermark', (p) => !p.watermark],
    ['Tanpa iklan', (p) => !p.ads],
    ['Konversi MP3', (p) => p.mp3],
    ['Download subtitle', (p) => p.subtitles],
    ['Kompres video', (p) => p.compress],
    ['Batch download', (p) => p.batch],
    ['Fast processing', (p) => p.fast],
    ['Priority server', (p) => p.priority],
    ['API access', (p) => p.api],
  ];

  function Cell({ v }) {
    if (v === true) return <span className="yes">✔</span>;
    if (v === false) return <span className="no">✖</span>;
    return <b>{v}</b>;
  }

  return (
    <section className="section">
      <div className="center">
        <h1 style={{ fontSize: 32, letterSpacing: '-0.7px' }}>Pilih paket kongvid kamu</h1>
        <p className="sub" style={{ margin: '10px 0 18px' }}>Mulai gratis, upgrade kapan saja. Pembayaran aman via Midtrans (GoPay, QRIS, VA bank, dll).</p>
        <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden' }}>
          <button className={`btn btn-sm ${cycle === 'monthly' ? 'btn-primary' : ''}`} style={{ border: 'none' }} onClick={() => setCycle('monthly')}>Bulanan</button>
          <button className={`btn btn-sm ${cycle === 'yearly' ? 'btn-primary' : ''}`} style={{ border: 'none' }} onClick={() => setCycle('yearly')}>Tahunan (hemat ±30%)</button>
        </div>
      </div>

      {msg && <div className="alert alert-info center">{msg}</div>}

      <div className="grid grid-3 mt" style={{ alignItems: 'stretch' }}>
        {Object.values(PLANS).map((p) => (
          <div key={p.id} className={`card price-card ${p.popular ? 'popular' : ''}`}>
            {p.popular && <span className="pop-tag">PALING POPULER</span>}
            <div>
              <h3>{p.name}</h3>
              <p className="muted small">{p.tagline}</p>
            </div>
            <div className="price">
              {p.priceMonthly === 0 ? 'Rp0' : formatIDR(cycle === 'monthly' ? p.priceMonthly : p.priceYearly)}
              <small>/{cycle === 'monthly' ? 'bln' : 'thn'}</small>
            </div>
            <ul className="feat">
              {rows.map(([label, fn]) => {
                const v = fn(p);
                const off = v === false;
                return (
                  <li key={label} className={off ? 'off' : ''}>
                    <Cell v={typeof v === 'boolean' ? v : v} /> <span>{label}: {typeof v === 'boolean' ? (v ? 'Ya' : 'Tidak') : v}</span>
                  </li>
                );
              })}
            </ul>
            <button
              className={`btn btn-block ${p.popular ? 'btn-primary' : ''}`}
              disabled={busy || (user?.plan === p.id)}
              onClick={() => buy(p.id)}
            >
              {user?.plan === p.id ? 'Paket aktif kamu' : p.id === 'free' ? 'Gratis — mulai sekarang' : `Upgrade ke ${p.name}`}
            </button>
          </div>
        ))}
      </div>

      <p className="center muted small mt">Langganan dapat dibatalkan kapan saja via dashboard Midtrans. Butuh bantuan? support@kongvid.app</p>
    </section>
  );
}
