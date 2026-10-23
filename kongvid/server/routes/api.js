// Kongvid - API download & tools (yt-dlp + ffmpeg) dengan job queue sederhana
const express = require('express');
const fs = require('fs');
const path = require('path');
const { auth, todayCount } = require('./auth');
const { read, write } = require('../store');
const engine = require('../engine');
const { getPlan } = require('../../lib/plans.cjs');

const router = express.Router();
const jobs = {}; // jobId -> { status, progress, message, file, kind }

function setJob(jobId, patch) {
  jobs[jobId] = Object.assign({}, jobs[jobId], patch);
  const all = read('jobs');
  const idx = all.findIndex((j) => j.id === jobId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...jobs[jobId] };
    write('jobs', all);
  }
}

function persistJob(job) {
  const all = read('jobs');
  all.push(job);
  write('jobs', all);
}

function addHistory(entry) {
  const h = read('history');
  h.push({ ...entry, date: new Date().toISOString().slice(0, 10), at: new Date().toISOString() });
  write('history', h);
}

function safeName(s) {
  return String(s || 'video').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'video';
}

// Preview info URL (tanpa login)
router.post('/info', async (req, res) => {
  const { url } = req.body || {};
  if (!url || !/^https?:\/\//.test(url)) return res.status(400).json({ error: 'URL tidak valid' });
  try {
    const info = await engine.getInfo(url);
    res.json(info);
  } catch (e) {
    res.status(422).json({ error: 'Gagal membaca video: ' + e.message.slice(0, 300) });
  }
});

// Mulai job download / mp3 / subtitle / compress
router.post('/start', auth, async (req, res) => {
  const { url, kind = 'video', quality = 480, lang, crf = 28, sourceFile } = req.body || {};
  const user = req.user;
  const plan = getPlan(user.plan);

  // cek limit harian
  if (kind !== 'compress') {
    const used = todayCount(user.id);
    if (used >= plan.dailyLimit) {
      return res.status(429).json({ error: `Limit harian tercapai (${plan.dailyLimit}x). Upgrade untuk limit lebih besar.`, upgrade: true });
    }
  }

  // cek hak akses fitur sesuai paket
  if (kind === 'mp3' && !plan.mp3) return res.status(403).json({ error: 'Konversi MP3 khusus Premium/Pro', upgrade: true });
  if (kind === 'subtitle' && !plan.subtitles) return res.status(403).json({ error: 'Download subtitle khusus Premium/Pro', upgrade: true });
  if (kind === 'compress' && !plan.compress) return res.status(403).json({ error: 'Kompres video khusus Premium/Pro', upgrade: true });

  // cek kualitas maksimal sesuai paket
  let q = Math.min(parseInt(quality) || 480, plan.maxQuality);

  const jobId = engine.id();
  jobs[jobId] = { status: 'queued', progress: 0, message: 'Memproses antrean…', kind };
  persistJob({ id: jobId, userId: user.id, url: url || null, kind, quality: q, status: 'queued', createdAt: new Date().toISOString(), title: '' });

  // jalankan async
  (async () => {
    try {
      setJob(jobId, { status: 'running', message: 'Mengambil informasi video…' });
      let out = null;
      if (kind === 'video') {
        const info = await engine.getInfo(url);
        setJob(jobId, { message: `Mendownload "${info.title}" ${q}p…`, title: info.title });
        out = await engine.downloadVideo(url, q, jobId);
        if (plan.watermark) {
          setJob(jobId, { message: 'Menambahkan watermark (paket Free)…' });
          out = await engine.addWatermark(out);
        }
      } else if (kind === 'mp3') {
        setJob(jobId, { message: 'Mengekstrak audio ke MP3…' });
        out = await engine.toMp3(url, jobId, true, '192');
      } else if (kind === 'subtitle') {
        setJob(jobId, { message: 'Mengunduh subtitle…' });
        out = await engine.getSubtitles(url, lang);
      } else if (kind === 'compress') {
        const input = path.join(engine.OUTPUT_DIR, path.basename(sourceFile || ''));
        if (!input.startsWith(engine.OUTPUT_DIR) || !fs.existsSync(input)) throw new Error('File sumber tidak ditemukan');
        setJob(jobId, { message: `Mengompres video (CRF ${crf})…` });
        out = await engine.compressVideo(input, crf, plan.fast ? 'veryfast' : 'medium');
      }
      const size = fs.statSync(out).size;
      setJob(jobId, { status: 'done', progress: 100, message: 'Selesai!', file: path.basename(out), size });
      addHistory({ userId: user.id, kind, url: url || '-', file: path.basename(out), quality: q, size, jobId });
    } catch (e) {
      setJob(jobId, { status: 'error', message: String(e.message).slice(0, 400) });
    }
  })();

  res.json({ jobId });
});

// Pantau progres job
router.get('/job/:id', auth, (req, res) => {
  const stored = read('jobs').find((j) => j.id === req.params.id);
  if (!stored || stored.userId !== req.user.id) return res.status(404).json({ error: 'Job tidak ditemukan' });
  const live = jobs[req.params.id] || {};
  res.json({ id: stored.id, ...stored, ...live });
});

// Unduh hasil file
router.get('/file/:id', auth, (req, res) => {
  const stored = read('jobs').find((j) => j.id === req.params.id);
  if (!stored || stored.userId !== req.user.id) return res.status(404).json({ error: 'File tidak ditemukan' });
  const live = jobs[req.params.id] || {};
  if (live.status !== 'done' || !live.file) return res.status(409).json({ error: 'File belum siap' });
  const fp = path.join(engine.OUTPUT_DIR, live.file);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File sudah dihapus dari server' });
  res.download(fp, live.file);
});

// Riwayat + sisa limit (dashboard)
router.get('/history', auth, (req, res) => {
  const plan = getPlan(req.user.plan);
  const items = read('history').filter((h) => h.userId === req.user.id).reverse().slice(0, 100);
  res.json({
    items,
    usedToday: todayCount(req.user.id),
    dailyLimit: plan.dailyLimit,
    plan: plan.id,
    maxQuality: plan.maxQuality,
  });
});

module.exports = { router };
