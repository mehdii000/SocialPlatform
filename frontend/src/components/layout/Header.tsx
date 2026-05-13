import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Home, Search, MessageCircle, Compass, User, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { fetchProfile } from '@/api/users';
import { logout } from '@/api/auth';
import { useAuthStore } from '@/hooks/useAuth';
import styles from './Header.module.css';

export function Header() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['myProfile'],
    queryFn: fetchProfile,
  });

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Token already expired or network error — clear anyway
    }
    clearAuth();
    navigate('/login');
  }, [clearAuth, navigate]);

  const handleSearch = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/profiles/${searchQuery.trim()}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  }, [searchQuery, navigate]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          SP
        </Link>

        <div className={styles.nav}>
          <Link to="/" className={styles.navItem} aria-label="Home"><Home size={18} /></Link>
          <Link to="/explore" className={styles.navItem} aria-label="Explore"><Compass size={18} /></Link>
          <button className={styles.navItem} onClick={() => setShowSearch(!showSearch)} aria-label="Search users"><Search size={18} /></button>
          <Link to="/messages" className={styles.navItem} aria-label="Messages"><MessageCircle size={18} /></Link>
        </div>

        <div className={styles.userArea}>
          <button className={styles.userBtn} onClick={() => setShowMenu(!showMenu)} aria-label="User menu">
            <Avatar src={profile?.avatar_url} username={profile?.username || '?'} size="sm" />
          </button>
          {showMenu && (
            <div className={styles.dropdown}>
              <button onClick={() => { navigate(`/profiles/${profile?.username}`); setShowMenu(false); }}>
                <User size={14} /> Profile
              </button>
              <button onClick={handleLogout}>
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {showSearch && (
        <div className={styles.searchBar}>
          <input
            className={styles.searchInput}
            placeholder="Search users by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            autoFocus
          />
        </div>
      )}
    </header>
  );
}
