import './globals.css';
import { AuthProvider } from '@/components/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'kongvid — Video Tools untuk download, convert, dan optimasi video dengan cepat',
  description:
    'kongvid adalah video tools untuk download, convert, dan optimasi video dengan cepat. Dukung YouTube, TikTok, Instagram, Facebook, dan ratusan situs lainnya.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="container">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
