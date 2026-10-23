export default function Footer() {
  return (
    <footer className="site">
      <div className="container inner">
        <div>
          <b>kongvid</b> — Video Tools untuk download, convert, dan optimasi video dengan cepat.
        </div>
        <div className="muted small">
          © {new Date().getFullYear()} kongvid. Gunakan hanya untuk konten yang Anda miliki atau berlisensi.
        </div>
      </div>
    </footer>
  );
}
