// Kongvid - definisi paket & batasan (versi ESM untuk Next.js)
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    maxQuality: 480,
    dailyLimit: 5,
    watermark: true,
    ads: true,
    mp3: false,
    subtitles: false,
    compress: false,
    batch: false,
    fast: false,
    priority: false,
    api: false,
    tagline: 'Coba dulu gratis',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 49000,
    priceYearly: 399000,
    maxQuality: 1080,
    dailyLimit: 50,
    watermark: false,
    ads: false,
    mp3: true,
    subtitles: true,
    compress: true,
    batch: false,
    fast: false,
    priority: false,
    api: false,
    tagline: 'Untuk kreator harian',
    popular: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 129000,
    priceYearly: 999000,
    maxQuality: 4320,
    dailyLimit: 500,
    watermark: false,
    ads: false,
    mp3: true,
    subtitles: true,
    compress: true,
    batch: true,
    fast: true,
    priority: true,
    api: true,
    tagline: 'Semua fitur terbuka penuh',
  },
};

export function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

export const QUALITY_OPTIONS = [144, 240, 360, 480, 720, 1080, 1440, 2160];

export function formatIDR(n) {
  return 'Rp' + n.toLocaleString('id-ID');
}
