import { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { relativeTime } from '@/utils/format';
import { fetchComments, createComment, deleteComment } from '@/api/posts';
import { useAuthStore } from '@/hooks/useAuth';
import styles from './CommentThread.module.css';

interface CommentThreadProps {
  postId: string;
}

export function CommentThread({ postId }: CommentThreadProps) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['comments', postId],
    queryFn: ({ pageParam }) => fetchComments(postId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await createComment(postId, newComment.trim());
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    } catch {}
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    } catch {}
  };

  const comments = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className={styles.thread}>
      <div className={styles.composer}>
        <textarea
          className={styles.input}
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          maxLength={280}
          rows={2}
        />
        <Button size="sm" onClick={handleSubmit} loading={sending} disabled={!newComment.trim()}>
          <Send size={14} />
        </Button>
      </div>

      {comments.map((c) => (
        <div key={c.id} className={styles.comment}>
          <Avatar username={c.username} size="sm" />
          <div className={styles.body}>
            <div className={styles.meta}>
              <span className={styles.username}>{c.username}</span>
              <span className={styles.time}>{relativeTime(c.created_at)}</span>
            </div>
            <p className={styles.text}>{c.content}</p>
          </div>
          {c.author_id === userId && (
            <button className={styles.deleteBtn} onClick={() => handleDelete(c.id)}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}

      {hasNextPage && (
        <button className={styles.loadMore} onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
