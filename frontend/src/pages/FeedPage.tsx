import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFeed, useInfiniteScroll } from '@/hooks/useFeed';
import { PostCard } from '@/components/features/posts/PostCard';
import { PostComposer } from '@/components/features/posts/PostComposer';
import { PostSkeleton } from '@/components/ui/Skeleton';
import styles from './FeedPage.module.css';

const EMPTY_SVG = (
  <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
    <rect x="10" y="10" width="100" height="60" rx="8" stroke="#2a2a2d" strokeWidth="1.5" />
    <line x1="24" y1="30" x2="96" y2="30" stroke="#2a2a2d" strokeWidth="1.5" />
    <line x1="24" y1="40" x2="72" y2="40" stroke="#2a2a2d" strokeWidth="1.5" />
    <circle cx="30" cy="55" r="4" stroke="#2a2a2d" strokeWidth="1.5" />
    <line x1="38" y1="55" x2="55" y2="55" stroke="#2a2a2d" strokeWidth="1.5" />
  </svg>
);

export default function FeedPage() {
  const queryClient = useQueryClient();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useFeed();

  const loadMoreRef = useInfiniteScroll(!!hasNextPage, isFetchingNextPage, fetchNextPage);

  const handlePostCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  }, [queryClient]);

  const handlePostDeleted = useCallback((postId: string) => {
    queryClient.setQueryData(['feed'], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          data: page.data.filter((p: any) => p.id !== postId),
        })),
      };
    });
  }, [queryClient]);

  const posts = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div>
      <PostComposer onPostCreated={handlePostCreated} />

      {isLoading && (
        <div className={styles.skeletonList}>
          {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
        </div>
      )}

      {isError && (
        <div className={styles.errorState}>
          <p>Something went wrong.</p>
          <button onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {!isLoading && !isError && posts.length === 0 && (
        <div className={styles.emptyState}>
          {EMPTY_SVG}
          <h3>No posts yet</h3>
          <p>Be the first to share something.</p>
        </div>
      )}

      <div className={styles.postList}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onDelete={handlePostDeleted} />
        ))}
      </div>

      <div ref={loadMoreRef} style={{ height: 1 }} />
      {isFetchingNextPage && <PostSkeleton />}
    </div>
  );
}
