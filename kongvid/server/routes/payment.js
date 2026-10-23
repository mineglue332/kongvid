// Kongvid - pembayaran Midtrans (subscription) + webhook
const express = require('express');
const crypto = require('crypto');
const { auth } = require('./auth');
const { read, write } = require('../store');
const { getPlan } = require('../../lib/plans.cjs');

const router = express.Router();

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const BASE_URL = MIDTRANS_IS_PRODUCTION ? 'https://app.midtrans.com' : 'https://sandbox.midtrans.com';

const PLAN_ITEMS = {
  premium_monthly: { plan: 'premium', cycle: 'monthly', price: 49000 },
  premium_yearly: { plan: 'premium', cycle: 'yearly', price: 399000 },
  pro_monthly: { plan: 'pro', cycle: 'monthly', price: 129000 },
  pro_yearly: { plan: 'pro', cycle: 'yearly', price: 999000 },
};

function subApi(pathname, body) {
  return fetch(BASE_URL + pathname, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

// Buat langganan (sewa / subscription) via Midtrans
router.post('/create-subscription', auth, async (req, res) => {
  const { itemId } = req.body || {};
  const item = PLAN_ITEMS[itemId];
  if (!item) return res.status(400).json({ error: 'Paket tidak dikenal' });
  if (!MIDTRANS_SERVER_KEY) {
    // Mode simulasi untuk development tanpa kunci Midtrans
    const simToken = 'sim-' + crypto.randomBytes(8).toString('hex');
    write('subs', [...read('subs'), { token: simToken, userId: req.user.id, itemId, status: 'pending', simulated: true, createdAt: new Date().toISOString() }]);
    return res.json({ simulated: true, token: simToken, message: 'Midtrans belum dikonfigurasi — mode simulasi. Gunakan tombol "Aktifkan Simulasi" untuk menguji upgrade.' });
  }
  try {
    const result = await subApi('/v1/subscriptions', {
      name: `Kongvid ${getPlan(item.plan).name} (${item.cycle})`,
      amount: item.price,
      currency: 'IDR',
      payment_type: ['bank_transfer', 'gopay', 'qris'],
      token_lifetime: { unit: item.cycle === 'monthly' ? 'month' : 'year', count: 1 },
      metadata: { user_id: req.user.id, item_id: itemId },
    });
    if (result.error_code) throw new Error(result.error_message || 'Gagal membuat subscription Midtrans');
    write('subs', [...read('subs'), { token: result.token, userId: req.user.id, itemId, status: 'created', createdAt: new Date().toISOString() }]);
    res.json({ token: result.token });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// Konfirmasi pembayaran subscription token
router.post('/pay', auth, async (req, res) => {
  const { token } = req.body || {};
  const subs = read('subs');
  const sub = subs.find((s) => s.token === token && s.userId === req.user.id);
  if (!sub) return res.status(404).json({ error: 'Subscription tidak ditemukan' });

  if (sub.simulated) {
    activate(req.user.id, PLAN_ITEMS[sub.itemId].plan, sub.itemId);
    sub.status = 'active';
    write('subs', subs);
    return res.json({ ok: true, plan: PLAN_ITEMS[sub.itemId].plan, simulated: true });
  }

  try {
    const st = await fetch(BASE_URL + '/v1/subscriptions/' + token + '/status', {
      headers: { Authorization: 'Basic ' + Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64') },
    }).then((r) => r.json());
    if (st.status_message === 'active' || st.transaction_status === 'settlement') {
      activate(req.user.id, PLAN_ITEMS[sub.itemId].plan, sub.itemId);
      sub.status = 'active';
      write('subs', subs);
      return res.json({ ok: true, plan: PLAN_ITEMS[sub.itemId].plan });
    }
    res.status(402).json({ error: 'Pembayaran belum selesai (' + (st.status_message || st.transaction_status || 'unknown') + ')' });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

function activate(userId, planId, itemId) {
  const users = read('users');
  const u = users.find((x) => x.id === userId);
  if (u) {
    u.plan = planId;
    u.subscription = { itemId, since: new Date().toISOString() };
    write('users', users);
  }
}

// Webhook Midtrans (notifikasi transaksi)
router.post('/webhook', express.raw({ type: '*/*' }), (req, res) => {
  let payload;
  try {
    payload = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString() : req.body);
  } catch {
    return res.status(400).send('invalid');
  }
  // verifikasi signatur
  if (MIDTRANS_SERVER_KEY) {
    const expected = crypto.createHash('sha512').update(payload.order_id + payload.status_code + payload.transaction_id + MIDTRANS_SERVER_KEY).digest('hex');
    if (expected !== payload.signature_key) return res.status(403).send('bad signature');
  }
  const subs = read('subs');
  const sub = subs.find((s) => s.token === (payload.transaction_id || ''));
  if (sub && ['capture', 'settlement'].includes(payload.transaction_status)) {
    activate(sub.userId, PLAN_ITEMS[sub.itemId]?.plan || 'free', sub.itemId);
    sub.status = 'active';
    write('subs', subs);
  }
  res.send('ok');
});

module.exports = { router };
