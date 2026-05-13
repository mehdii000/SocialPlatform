import { useState } from 'react';
import { clsx } from 'clsx';
import styles from './Avatar.module.css';

interface AvatarProps {
  src?: string | null;
  username: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

const BASE = import.meta.env.VITE_API_BASE_URL || '';

export function Avatar({ src, username, size = 'md', className }: AvatarProps) {
  const url = src ? `${BASE}/api/media/profiles/${src}` : null;

  const [imgError, setImgError] = useState(false);

  if (url && !imgError) {
    return (
      <img
        className={clsx(styles.avatar, styles[size], className)}
        src={url}
        alt={username}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={clsx(styles.avatar, styles.fallback, styles[size], className)}>
      {initials(username)}
    </div>
  );
}
