// Kongvid - Backend API (Node.js + Express)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { router: authRouter } = require('./routes/auth');
const { router: apiRouter } = require('./routes/api');
const { router: payRouter } = require('./routes/payment');
const engine = require('./engine');
const { PLANS } = require('../lib/plans.cjs');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'kongvid-api', engine: 'yt-dlp + ffmpeg' }));
app.get('/api/plans', (req, res) => res.json(PLANS));

app.use('/api/auth', authRouter);
app.use('/api', apiRouter);
app.use('/api/payment', payRouter);

// upload video untuk dikompres (Premium/Pro) - simpan ke folder output
const multerFree = false;
app.post('/api/upload', require('./routes/auth').auth, express.urlencoded({ extended: false }), (req, res) => {
  // sederhana: client mengirim base64 di body JSON
  const { name, data } = req.body || {};
  const plan = PLANS[req.user.plan] || PLANS.free;
  if (!plan.compress) return res.status(403).json({ error: 'Kompres video khusus Premium/Pro', upgrade: true });
  if (!data) return res.status(400).json({ error: 'Data file kosong' });
  const safe = path.basename(String(name || 'upload.mp4')).replace(/[^\w.\-]/g, '_');
  const fp = path.join(engine.OUTPUT_DIR, Date.now() + '-' + safe);
  require('fs').writeFileSync(fp, Buffer.from(data.split(',').pop(), 'base64'));
  res.json({ file: path.basename(fp) });
});

const PORT = process.env.API_PORT || 4000;
app.listen(PORT, () => console.log(`[kongvid-api] berjalan di http://localhost:${PORT}`));
