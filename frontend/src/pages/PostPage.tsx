import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Heart, MessageCircle } from 'lucide-react';
import { fetchPost } from '@/api/posts';
import { Avatar } from '@/components/ui/Avatar';
import { CommentThread } from '@/components/features/posts/CommentThread';
import { relativeTime, formatCount } from '@/utils/format';
import styles from './PostPage.module.css';

const MEDIA_BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api/media/posts/';

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => fetchPost(postId!),
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <div className={styles.center}>
        <div className={styles.loader} />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className={styles.center}>
        <p className={styles.notFound}>Post not found.</p>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  return (
    <div>
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <article className={styles.post}>
        <div className={styles.header}>
          <button className={styles.author} onClick={() => navigate(`/profiles/${post.username}`)}>
            <Avatar username={post.username} size="sm" />
            <span className={styles.username}>{post.username}</span>
          </button>
          <span className={styles.time}>{relativeTime(post.created_at)}</span>
        </div>

        <p className={styles.content}>{post.content}</p>

        {post.media_url && (
          <img src={MEDIA_BASE + post.media_url} alt="" className={styles.media} />
        )}

        <div className={styles.stats}>
          <span className={styles.stat}><Heart size={14} /> {formatCount(post.likes_count)} likes</span>
          <span className={styles.stat}><MessageCircle size={14} /> {formatCount(post.comments_count)} comments</span>
        </div>
      </article>

      <CommentThread postId={post.id} />
    </div>
  );
}
