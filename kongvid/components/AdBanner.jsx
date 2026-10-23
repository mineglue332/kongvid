'use client';
// Iklan ringan — hanya ditampilkan untuk user paket free
import Link from 'next/link';
import { useAuth } from './AuthContext';

const ADS = [
  'Butuh render video lebih cepat? Coba editor cloud kami — gratis 14 hari!',
  'Tahu tidak? Paket Premium kongvid bisa download sampai 1080p tanpa watermark.',
  'Kreator lokal: tingkatkan kualitas audio videomu dengan noise removal AI.',
];

export default function AdBanner() {
  const { user } = useAuth();
  if (user && !user.ads) return null; // premium/pro: tanpa iklan
  const ad = ADS[new Date().getDate() % ADS.length];
  return (
    <div className="ad-banner">
      <b>AD ·</b> {ad}{' '}
      <Link href="/pricing" style={{ color: 'var(--accent)', fontWeight: 700 }}>Hilangkan iklan →</Link>
    </div>
  );
}
