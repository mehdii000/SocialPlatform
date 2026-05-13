import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/utils/format';
import type { PublicProfile, UserProfile } from '@/types';
import styles from './ProfileHeader.module.css';

interface ProfileHeaderProps {
  profile: PublicProfile | UserProfile;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isOwn?: boolean;
  followLoading?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onMessage?: () => void;
  onEdit?: () => void;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}

export function ProfileHeader({
  profile,
  followersCount = 0,
  followingCount = 0,
  isFollowing = false,
  isOwn = false,
  followLoading = false,
  onFollow,
  onUnfollow,
  onMessage,
  onEdit,
  onFollowersClick,
  onFollowingClick,
}: ProfileHeaderProps) {
  return (
    <div className={styles.hero}>
      <div className={styles.cover} />
      <div className={styles.info}>
        <Avatar
          src={profile.avatar_url}
          username={profile.username}
          size="xl"
        />
        <div className={styles.details}>
          <div className={styles.nameRow}>
            <h1 className={styles.displayName}>
              {'display_name' in profile ? (profile as UserProfile).display_name || profile.username : profile.username}
            </h1>
            <span className={styles.username}>@{profile.username}</span>
          </div>
          <p className={styles.bio}>{profile.bio || 'No bio yet.'}</p>
          <div className={styles.stats}>
            <button className={styles.stat} onClick={onFollowersClick}>
              <strong>{followersCount}</strong> followers
            </button>
            <button className={styles.stat} onClick={onFollowingClick}>
              <strong>{followingCount}</strong> following
            </button>
          </div>
          {'created_at' in profile && (
            <p className={styles.joined}>Joined {formatDate((profile as UserProfile).created_at)}</p>
          )}
        </div>
        <div className={styles.actions}>
          {isOwn ? (
            <Button variant="secondary" size="sm" onClick={onEdit}>Edit profile</Button>
          ) : (
            <>
              {isFollowing ? (
                <Button variant="secondary" size="sm" onClick={onUnfollow} loading={followLoading}>Following</Button>
              ) : (
                <Button size="sm" onClick={onFollow} loading={followLoading}>Follow</Button>
              )}
              <Button variant="secondary" size="sm" onClick={onMessage}>Message</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
