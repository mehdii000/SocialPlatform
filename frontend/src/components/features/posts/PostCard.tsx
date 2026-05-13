import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar } from '@/components/ui/Avatar';
import { relativeTime, formatCount } from '@/utils/format';
import { likePost, deletePost } from '@/api/posts';
import { useAuthStore } from '@/hooks/useAuth';
import type { Post } from '@/types';
import styles from './PostCard.module.css';

const MEDIA_BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api/media/posts/';

interface PostCardProps {
  post: Post;
  onDelete?: (id: string) => void;
}

export function PostCard({ post, onDelete }: PostCardProps) {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showMenu, setShowMenu] = useState(false);

  const handleLike = useCallback(async () => {
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    try {
      await likePost(post.id);
    } catch {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  }, [isLiked, likesCount, post.id]);

  const handleDelete = useCallback(async () => {
    try {
      await deletePost(post.id);
      onDelete?.(post.id);
    } catch {}
    setShowMenu(false);
  }, [post.id, onDelete]);

  return (
    <article className={styles.card} onClick={() => navigate(`/posts/${post.id}`)}>
      <div className={styles.header}>
        <div className={styles.author} onClick={(e) => { e.stopPropagation(); navigate(`/profiles/${post.username}`); }}>
          <Avatar username={post.username} size="sm" />
          <span className={styles.displayName}>{post.username}</span>
          <span className={styles.time}>{relativeTime(post.created_at)}</span>
        </div>
        {post.user_id === userId && (
          <div className={styles.menuWrap}>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} aria-label="Post actions">
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div className={styles.dropdown}>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} aria-label="Delete post">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className={styles.content}>{post.content}</p>

      {post.media_url && (
        <div className={styles.mediaWrap}>
          <img
            src={MEDIA_BASE + post.media_url}
            alt=""
            className={styles.media}
            loading="lazy"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
        <button className={clsx(styles.actionBtn, isLiked && styles.liked)} onClick={handleLike} aria-label={isLiked ? 'Unlike' : 'Like'}>
          <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
          <span>{formatCount(likesCount)}</span>
        </button>
        <button className={styles.actionBtn} aria-label="Comments">
          <MessageCircle size={16} />
          <span>{formatCount(post.comments_count)}</span>
        </button>
      </div>
    </article>
  );
}
