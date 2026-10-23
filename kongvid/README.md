# kongvid 🎬

**Video Tools untuk download, convert, dan optimasi video dengan cepat.**
Dukungan YouTube, TikTok, Instagram, Facebook, Twitter/X, Twitch, dan 900+ situs lainnya (berkat yt-dlp).

## Fitur

**Utama**
- ⬇️ Download video dari hampir semua situs
- 🎚️ Pilih kualitas: 360p / 720p / 1080p / 1440p / 4K (tergantung paket)
- 🎵 Audio MP3 (konversi video → mp3 192kbps)

**Tambahan**
- 💬 Download subtitle (.srt, manual/auto-caption)
- 🔄 Konvert video ke audio
- 🗄️ Kompres video (ffmpeg CRF, pilih kualitas vs ukuran)

**Halaman**
- `/` Home — input URL, tombol Download, preview video + pilihan kualitas
- `/tools` Creator Tools — MP3 Converter, Compress Video, Subtitle Download
- `/dashboard` — riwayat download, sisa limit harian, upgrade plan
- `/pricing` — Free vs Premium vs Pro + pembayaran Midtrans
- `/login`, `/register` — email/password + Google OAuth

## Model Bisnis

| | Free | Premium (Rp49rb/bln) | Pro (Rp129rb/bln) |
|---|---|---|---|
| Kualitas maks | **480p** | 720p/1080p | 4K/8K |
| Limit/hari | **5x** | 50x | 500x |
| Watermark | ✔ ada | tanpa | tanpa |
| Iklan | ringan | tanpa | tanpa |
| MP3 / Subtitle / Kompres | ✖ | ✔ | ✔ |
| Batch, Fast processing, Priority server, API | ✖ | ✖ | ✔ |

## Arsitektur

```
Frontend : Next.js 14 (App Router)        -> port 3000
Backend  : Node.js Express                -> port 4000 (/api/*)
Engine   : yt-dlp (download/info/subs) + ffmpeg (mp3, kompres, watermark)
Data     : JSON store (server/data) — ganti dengan DB (Postgres/Mongo) untuk produksi
Auth     : JWT + bcrypt, Google OAuth 2.0 (authorization code)
Payment  : Midtrans Subscription API + webhook (sandbox/production)
```

## Menjalankan (node v26 via fnm + pnpm)

```bash
# 1. Pasang fnm + node 26 + pnpm (Linux)
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc
fnm install 26 && fnm use 26
corepack enable || npm i -g pnpm

# 2. Pasang engine
pip install yt-dlp        # atau unduh binary dari github.com/yt-dlp/yt-dlp
# ffmpeg sudah tersedia di sistem (apt install ffmpeg bila belum)

# 3. Install & jalankan
cd kongvid
cp .env.example .env      # isi kredensial Google & Midtrans bila perlu
pnpm install
pnpm dev                  # web :3000 + api :4000 bersamaan
```

Build produksi: `pnpm build && pnpm start`.

## Konfigurasi `.env`

| Variabel | Keterangan |
|---|---|
| `JWT_SECRET` | secret token sesi |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth Client ID; redirect URI: `http://localhost:3000/login/callback` |
| `MIDTRANS_SERVER_KEY` | Dashboard Midtrans → Web & API Keys. **Kosong = mode simulasi** (upgrade langsung aktif untuk testing) |
| `MIDTRANS_IS_PRODUCTION` | `true` untuk environment asli |
| Webhook Midtrans | arahkan ke `https://domainmu/api/payment/webhook` |

## Struktur folder

```
kongvid/
├── app/                 # Next.js App Router (Home, tools, dashboard, pricing, login, register)
├── components/          # Navbar, Downloader, AuthContext, AdBanner, dll
├── lib/plans.mjs|.cjs   # definisi paket (dipakai FE & BE)
├── server/
│   ├── index.js         # Express entrypoint
│   ├── engine.js        # wrapper yt-dlp + ffmpeg
│   ├── store.js         # penyimpanan JSON sederhana
│   └── routes/          # auth.js, api.js (download/tools), payment.js (Midtrans)
└── .env.example
```

## Catatan hukum

Gunakan hanya untuk konten milik sendiri atau yang berlisensi bebas. Hormati ToS platform sumber.
