import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import type { FollowInfo } from '@/types';
import styles from './FollowList.module.css';

interface FollowListProps {
  userId: string;
  type: 'followers' | 'following';
  followers: FollowInfo[];
  following: FollowInfo[];
  onClose: () => void;
}

export function FollowList({ type, followers, following, onClose }: FollowListProps) {
  const navigate = useNavigate();
  const list = type === 'followers' ? followers : following;
  const title = type === 'followers' ? 'Followers' : 'Following';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className={styles.list}>
          {list.length === 0 && (
            <p className={styles.empty}>
              {type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </p>
          )}
          {list.map((f) => (
            <button
              key={f.user_id}
              className={styles.user}
              onClick={() => {
                navigate(`/profiles/${f.username}`);
                onClose();
              }}
            >
              <Avatar src={f.avatar_url} username={f.username} size="sm" />
              <span className={styles.username}>{f.username}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
