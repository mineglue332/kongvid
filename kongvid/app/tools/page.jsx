'use client';
// Kongvid - Creator Tools: MP3 Converter, Compress Video, Subtitle Downloader
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth, API } from '@/components/AuthContext';
import { fmtSize } from '@/components/Downloader';

const TABS = [
  { id: 'mp3', label: '🎵 MP3 Converter', need: 'mp3' },
  { id: 'compress', label: '🗄️ Compress Video', need: 'compress' },
  { id: 'subtitle', label: '💬 Subtitle Download', need: 'subtitles' },
];

export default function ToolsPage() {
  const { user, api, loading } = useAuth();
  const [tab, setTab] = useState('mp3');
  const [url, setUrl] = useState('');
  const [crf, setCrf] = useState(28);
  const [fileList, setFileList] = useState([]);
  const [sourceFile, setSourceFile] = useState('');
  const [error, setError] = useState('');
  const [job, setJob] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);
  useEffect(() => {
    if (user) api('/api/history').then((h) => setFileList(h.items.filter((i) => i.kind === 'video'))).catch(() => {});
  }, [user]);

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

  async function run(srcOverride) {
    setError(''); setJob(null);
    if (!user) return setError('Login dulu untuk memakai Creator Tools.');
    const meta = TABS.find((t) => t.id === tab);
    if (user.features && !user.features[meta.need]) {
      return setError(`Fitur "${meta.label}" tersedia untuk paket Premium/Pro. Upgrade di halaman Pricing.`);
    }
    try {
      const payload = { kind: tab, url };
      if (tab === 'compress') {
        payload.crf = parseInt(crf);
        payload.sourceFile = srcOverride || sourceFile;
        if (!payload.sourceFile) return setError('Pilih file dari riwayat download pada dropdown, atau unggah video langsung.');
      }
      if (tab === 'mp3' && !url) return setError('Masukkan URL video yang mau dikonversi ke MP3.');
      if (tab === 'subtitle' && !url) return setError('Masukkan URL video untuk diambil subtitle-nya.');
      const r = await api('/api/start', { method: 'POST', body: JSON.stringify(payload) });
      setJob({ status: 'queued', message: 'Diproses…' });
      startPoll(r.jobId);
    } catch (e) {
      setError(e.message);
    }
  }

  // upload file lokal untuk dikompres (base64 -> /api/upload -> /api/start)
  async function onUpload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!user) return setError('Login dulu.');
    setError(''); setJob({ status: 'running', message: `Mengunggah ${f.name}…` });
    const reader = new FileReader();
    reader.onerror = () => setError('Gagal membaca file');
    reader.onload = async () => {
      try {
        const r = await api('/api/upload', { method: 'POST', body: JSON.stringify({ name: f.name, data: reader.result }) });
        const res = await api('/api/start', { method: 'POST', body: JSON.stringify({ kind: 'compress', sourceFile: r.file, crf: parseInt(crf) }) });
        setJob({ status: 'queued', message: 'Mengompres video terunggah…' });
        startPoll(res.jobId);
      } catch (err) {
        setError(err.message);
        setJob(null);
      }
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  }

  function saveFile(id) {
    const token = localStorage.getItem('kongvid_token');
    fetch(API + '/api/file/' + id, { headers: { Authorization: 'Bearer ' + token } })
      .then((r) => { if (!r.ok) throw new Error('Gagal'); return r.blob(); })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = job?.file || 'output';
        a.click();
      })
      .catch(() => setError('Gagal mengunduh hasil.'));
  }

  return (
    <section className="section">
      <h1 style={{ fontSize: 30, letterSpacing: '-0.5px' }}>🛠️ Creator Tools</h1>
      <p className="sub">Convert, kompres, dan ambil subtitle — semua diproses dengan engine yt-dlp + ffmpeg.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : ''}`} onClick={() => { setTab(t.id); setJob(null); setError(''); }}>
            {t.label} {!user || (user.features && !user.features[t.need]) ? '🔒' : ''}
          </button>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        {tab !== 'compress' && (
          <div className="dl-row mb">
            <input placeholder="Tempel URL video…" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
        )}

        {tab === 'compress' && (
          <>
            <label className="muted small">Kekuatan kompresi (CRF — makin besar makin kecil file)</label>
            <div className="dl-row mb mt" style={{ alignItems: 'center' }}>
              <input type="range" min="18" max="35" value={crf} onChange={(e) => setCrf(e.target.value)} style={{ padding: 4 }} />
              <b style={{ minWidth: 150 }}>CRF {crf} · {crf <= 23 ? 'kualitas tinggi' : crf <= 28 ? 'seimbang' : 'ukuran kecil'}</b>
            </div>
            <p className="muted small mb">Sumber: pilih file hasil download kamu, atau unggah video langsung:</p>
            <div className="dl-row mb">
              <select value={sourceFile} onChange={(e) => setSourceFile(e.target.value)}>
                <option value="">Pilih file dari riwayat download…</option>
                {fileList.map((f) => (
                  <option key={f.jobId} value={f.file}>{f.file} ({fmtSize(f.size)})</option>
                ))}
              </select>
              <label className="btn" style={{ whiteSpace: 'nowrap' }}>
                📤 Unggah Video
                <input type="file" accept="video/*" hidden onChange={onUpload} />
              </label>
            </div>
          </>
        )}

        <button className="btn btn-accent btn-block" onClick={() => run()} disabled={tab === 'compress' && !sourceFile}>
          {tab === 'mp3' ? '🎵 Convert ke MP3' : tab === 'subtitle' ? '💬 Download Subtitle' : '🗄️ Kompres Video Terpilih'}
        </button>

        {error && <div className="alert alert-error">{error} <Link href="/pricing" style={{ textDecoration: 'underline' }}>Lihat Pricing →</Link></div>}

        {job && (
          <div className="mt">
            <strong>{job.status === 'done' ? '✅ ' : job.status === 'error' ? '⚠️ ' : '⏳ '}{job.message}</strong>
            {job.status !== 'error' && <div className="progress"><div style={{ width: (job.progress || (job.status === 'running' ? 40 : 0)) + '%' }} /></div>}
            {job.status === 'done' && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="muted small">{job.file} ({fmtSize(job.size)})</span>
                <button className="btn btn-sm btn-primary" onClick={() => saveFile(job.id)}>💾 Simpan File</button>
              </div>
            )}
          </div>
        )}

        {loading && <p className="muted small mt">Memuat sesi…</p>}
        {!loading && !user && <p className="muted small mt">⚠️ Semua tool butuh akun. <Link href="/login" style={{ color: 'var(--accent)' }}>Masuk</Link> / <Link href="/register" style={{ color: 'var(--accent)' }}>Daftar</Link></p>}
      </div>
    </section>
  );
}
