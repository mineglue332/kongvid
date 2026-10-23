// Kongvid - autentikasi: email/password + Google OAuth + JWT
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { read, write } = require('../store');
const { getPlan } = require('../../lib/plans.cjs');

const SECRET = process.env.JWT_SECRET || 'kongvid-dev-secret-change-me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT = process.env.AUTH_REDIRECT || 'http://localhost:3000/login/callback';

const router = express.Router();

function publicUser(u) {
  const plan = getPlan(u.plan);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar || null,
    provider: u.provider,
    plan: u.plan,
    planName: plan.name,
    maxQuality: plan.maxQuality,
    dailyLimit: plan.dailyLimit,
    watermark: plan.watermark,
    ads: plan.ads,
    features: { mp3: plan.mp3, subtitles: plan.subtitles, compress: plan.compress, batch: plan.batch, api: plan.api },
    createdAt: u.createdAt,
  };
}

function sign(u) {
  return jwt.sign({ uid: u.id }, SECRET, { expiresIn: '7d' });
}

function todayCount(userId) {
  const day = new Date().toISOString().slice(0, 10);
  return read('history').filter((h) => h.userId === userId && h.date === day).length;
}

// ---------- Email / Password ----------
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });
  if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
  const users = read('users');
  if (users.some((u) => u.email === email.toLowerCase())) {
    return res.status(409).json({ error: 'Email sudah terdaftar' });
  }
  const user = {
    id: 'u-' + crypto.randomBytes(6).toString('hex'),
    name: name || email.split('@')[0],
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 10),
    provider: 'email',
    plan: 'free',
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  write('users', users);
  res.json({ token: sign(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = read('users').find((u) => u.email === (email || '').toLowerCase());
  if (!user || user.provider !== 'email' || !(await bcrypt.compare(password || '', user.passwordHash || ''))) {
    return res.status(401).json({ error: 'Email atau password salah' });
  }
  res.json({ token: sign(user), user: publicUser(user) });
});

// ---------- Google OAuth (authorization code flow) ----------
router.get('/google/url', (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(501).json({ error: 'Google login belum dikonfigurasi. Set GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET di .env' });
  const state = crypto.randomBytes(8).toString('hex');
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  res.json({ url: 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString(), state });
});

router.post('/google', async (req, res) => {
  const { code } = req.body || {};
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ error: 'Google login belum dikonfigurasi di server (.env)' });
  }
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT,
        grant_type: 'authorization_code',
      }),
    });
    const tok = await r.json();
    if (!tok.access_token) throw new Error(tok.error_description || 'Gagal menukar kode Google');
    const me = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + tok.access_token } })).json();
    const users = read('users');
    let user = users.find((u) => u.email === (me.email || '').toLowerCase());
    if (!user) {
      user = {
        id: 'u-' + crypto.randomBytes(6).toString('hex'),
        name: me.name || me.email.split('@')[0],
        email: (me.email || '').toLowerCase(),
        avatar: me.picture || null,
        provider: 'google',
        plan: 'free',
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      write('users', users);
    } else {
      user.avatar = me.picture || user.avatar;
      write('users', users);
    }
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- Session ----------
router.get('/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user), usedToday: todayCount(req.user.id) });
});

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Harus login terlebih dahulu' });
  try {
    const payload = jwt.verify(token, SECRET);
    const user = read('users').find((u) => u.id === payload.uid);
    if (!user) return res.status(401).json({ error: 'Sesi tidak valid' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Sesi kedaluwarsa, silakan login ulang' });
  }
}

module.exports = { router, auth, publicUser, todayCount };
