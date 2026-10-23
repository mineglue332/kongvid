'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="logo">kong<span>vid</span></Link>
        <nav className="nav-links">
          <Link href="/" className={pathname === '/' ? 'active' : ''}>Home</Link>
          <Link href="/tools" className={pathname?.startsWith('/tools') ? 'active' : ''}>Creator Tools</Link>
          <Link href="/pricing" className={pathname?.startsWith('/pricing') ? 'active' : ''}>Pricing</Link>
          {user && <Link href="/dashboard" className={pathname?.startsWith('/dashboard') ? 'active' : ''}>Dashboard</Link>}
        </nav>
        <div className="nav-right">
          {!loading && !user && (
            <>
              <Link href="/login"><button className="btn btn-sm">Masuk</button></Link>
              <Link href="/register"><button className="btn btn-sm btn-primary">Daftar</button></Link>
            </>
          )}
          {user && (
            <>
              <span className={`badge badge-${user.plan}`}>{user.planName}</span>
              <button
                className="btn btn-sm"
                onClick={() => { logout(); router.push('/'); }}
                title={user.email}
              >
                {user.name.split(' ')[0]} · Keluar
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
