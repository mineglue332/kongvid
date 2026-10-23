import Link from 'next/link';
import Downloader from '@/components/Downloader';
import AdBanner from '@/components/AdBanner';

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Download, convert &amp; optimasi video <em>dalam hitungan detik</em></h1>
        <p>kongvid adalah Video Tools untuk download, convert, dan optimasi video dengan cepat. Dukung YouTube, TikTok, Instagram, Facebook, Twitter/X, dan ratusan situs lainnya.</p>
        <div className="platforms">
          {['▶️ YouTube', '🎵 TikTok', '📸 Instagram', '👥 Facebook', '🐦 Twitter/X', '🎮 Twitch', '➕ 900+ situs'].map((p) => (
            <span key={p} className="platform-chip">{p}</span>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="dl-box">
          <Downloader />
        </div>
      </section>

      <AdBanner />

      <section className="section">
        <h2>Fitur Utama</h2>
        <p className="sub">Semua yang kamu butuhkan untuk bekerja dengan video.</p>
        <div className="grid grid-3">
          <div className="card">
            <div className="tool-icon">⬇️</div>
            <h3>Download Video</h3>
            <p className="muted small mt">Tempel URL, pilih kualitas (360p / 720p / 1080p dan seterusnya), lalu unduh sebagai MP4.</p>
          </div>
          <div className="card">
            <div className="tool-icon">🎵</div>
            <h3>Audio MP3</h3>
            <p className="muted small mt">Konversi video apa pun menjadi MP3 192kbps bersih — sempurna untuk musik &amp; podcast.</p>
          </div>
          <div className="card">
            <div className="tool-icon">💬</div>
            <h3>Subtitle Download</h3>
            <p className="muted small mt">Unduk subtitle manual maupun auto-caption sebagai file .srt.</p>
          </div>
          <div className="card">
            <div className="tool-icon">🗄️</div>
            <h3>Kompres Video</h3>
            <p className="muted small mt">Perkecil ukuran file dengan ffmpeg tanpa kehilangan kualitas berarti.</p>
          </div>
          <div className="card">
            <div className="tool-icon">🔄</div>
            <h3>Convert Video → Audio</h3>
            <p className="muted small mt">Ekstrak audio dari video hasil download atau langsung dari URL.</p>
          </div>
          <div className="card">
            <div className="tool-icon">⚡</div>
            <h3>Cepat &amp; Stabil</h3>
            <p className="muted small mt">Engine yt-dlp + ffmpeg dengan priority server untuk paket Pro.</p>
          </div>
        </div>
      </section>

      <section className="section center">
        <div className="card" style={{ padding: 34 }}>
          <h2>Tingkatkan ke Premium 🚀</h2>
          <p className="sub" style={{ margin: '10px 0 18px' }}>Buka 1080p, MP3, tanpa watermark, tanpa iklan, dan limit 50 download/hari.</p>
          <Link href="/pricing"><button className="btn btn-primary btn-lg">Lihat Paket &amp; Harga</button></Link>
        </div>
      </section>
    </>
  );
}
