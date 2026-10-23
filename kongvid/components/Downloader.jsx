'use client';
// Kongvid - komponen downloader utama: input URL -> preview -> pilih kualitas -> download
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import { API } from './AuthContext';

export function fmtSize(b) {
  if (!b) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (b >= 1024 && i < 3) { b /= 1024; i++; }
  return b.toFixed(1) + ' ' + u[i];
}

export function fmtDur(s) {
  s = Math.round(s || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

export default function Downloader({ mode = 'video' }) {
  const { user, api, loading } = useAuth();
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [job, setJob] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function fetchInfo() {
    setError(''); setInfo(null); setJob(null);
    if (!url.trim()) return setError('Masukkan URL video terlebih dahulu');
    setBusy(true);
    try {
      const j = await api('/api/info', { method: 'POST', body: JSON.stringify({ url }) });
      setInfo(j);
      const maxQ = user ? user.maxQuality : 480;
      const avail = j.qualities.filter((q) => q.height <= maxQ);
      setSelected(avail.length ? avail[avail.length - 1].height : null);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  function startPoll(jobId) {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const j = await api('/api/job/' + jobId);
        setJob(j);
        if (j.status === 'done' || j.status === 'error') clearInterval(pollRef.current);
      } catch {}
    }, 1500);
  }

  async function start(kind) {
    if (!user) { setError('Login dulu untuk mulai mendownload.'); return; }
    setError('');
    const payload = { url, kind, quality: selected || 480 };
    if (kind === 'subtitle') payload.lang = 'id,en';
    try {
      const r = await api('/api/start', { method: 'POST', body: JSON.stringify(payload) });
      setJob({ status: 'queued', message: 'Diproses…' });
      startPoll(r.jobId);
    } catch (e) {
      setError(e.message + (e.data?.upgrade ? ' — lihat paket di halaman Pricing.' : ''));
    }
  }

  const maxQ = user ? user.maxQuality : 480;
  const qualities = info?.qualities || [];

  function downloadFile(fileId) {
    const token = localStorage.getItem('kongvid_token');
    // ambil file via fetch (header auth) lalu trigger save lewat blob
    fetch(API + '/api/file/' + fileId, { headers: { Authorization: 'Bearer ' + token } })
      .then((r) => {
        if (!r.ok) throw new Error('Gagal mengunduh file');
        return r.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = job?.file || 'download';
        a.click();
      })
      .catch((e) => setError(e.message));
  }

  return (
    <div className="dl-box">
      <div className="dl-row">
        <input
          placeholder="Tempel link video… (YouTube, TikTok, Instagram, Facebook, Twitter/X, dll)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
        />
        <button className="btn btn-primary btn-lg" onClick={fetchInfo} disabled={busy}>
          {busy ? 'Mencari…' : mode === 'video' ? 'Download' : 'Mulai'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error} {!loading && !user && error.includes('Login') && <Link href="/login" style={{ textDecoration: 'underline' }}>Masuk sekarang</Link>}</div>}

      {info && (
        <div className="card preview">
          {info.thumbnail && <img src={info.thumbnail} alt="" />}
          <div className="meta" style={{ flex: 1, minWidth: 240 }}>
            <h3>{info.title}</h3>
            <p>{info.uploader} · {fmtDur(info.duration)} · dari {info.extractor}</p>

            {mode === 'video' && (
              <>
                <div className="qual-grid">
                  {qualities.map((q) => {
                    const locked = q.height > maxQ;
                    return (
                      <button
                        key={q.height}
                        className={`qual ${selected === q.height ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                        onClick={() => !locked && setSelected(q.height)}
                        title={locked ? `Butuh upgrade (maks paketmu ${maxQ}p)` : ''}
                      >
                        {q.height}p {locked ? '🔒' : ''}
                      </button>
                    );
                  })}
                </div>
                {user?.watermark && <p className="small muted mt">ℹ️ Paket Free: maksimal 480p, hasil diberi watermark kongvid.</p>}
                {!user && <p className="small muted mt">ℹ️ Tanpa login/Free: hanya sampai 480p. <Link href="/pricing" style={{ color: 'var(--accent)' }}>Lihat Premium →</Link></p>}
                <div className="mt" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-accent" onClick={() => start('video')} disabled={!selected}>
                    ⬇️ Download Video {selected ? selected + 'p' : ''}
                  </button>
                  <button className="btn" onClick={() => start('mp3')} title={user && !user.features.mp3 ? 'Khusus Premium' : ''}>
                    🎵 MP3 {!user || !user.features.mp3 ? '🔒' : ''}
                  </button>
                  <button className="btn" onClick={() => start('subtitle')} title={user && !user.features.subtitles ? 'Khusus Premium' : ''}>
                    💬 Subtitle {!user || !user.features.subtitles ? '🔒' : ''}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {job && (
        <div className="card mt">
          <strong>{job.status === 'done' ? '✅ ' : job.status === 'error' ? '⚠️ ' : '⏳ '}{job.message}</strong>
          {job.status !== 'error' && (
            <div className="progress"><div style={{ width: (job.progress || (job.status === 'running' ? 35 : 0)) + '%' }} /></div>
          )}
          {job.status === 'done' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
              <span className="muted small">{job.file} ({fmtSize(job.size)})</span>
              <button className="btn btn-sm btn-primary" onClick={() => downloadFile(job.id)}>💾 Simpan File</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
