import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFeed, useInfiniteScroll } from '@/hooks/useFeed';
import { useForYouFeed } from '@/hooks/useForYouFeed';
import { PostCard } from '@/components/features/posts/PostCard';
import { PostComposer } from '@/components/features/posts/PostComposer';
import { PostSkeleton } from '@/components/ui/Skeleton';
import type { PaginatedResponse, Post } from '@/types';
import styles from './FeedPage.module.css';

function EmptyFeedSvg() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
      <rect x="10" y="10" width="100" height="60" rx="8" stroke="#2a2a2d" strokeWidth="1.5" />
      <line x1="24" y1="30" x2="96" y2="30" stroke="#2a2a2d" strokeWidth="1.5" />
      <line x1="24" y1="40" x2="72" y2="40" stroke="#2a2a2d" strokeWidth="1.5" />
      <circle cx="30" cy="55" r="4" stroke="#2a2a2d" strokeWidth="1.5" />
      <line x1="38" y1="55" x2="55" y2="55" stroke="#2a2a2d" strokeWidth="1.5" />
    </svg>
  );
}

export default function FeedPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'following' | 'forYou'>('following');

  const feedQuery = useFeed();
  const forYouQuery = useForYouFeed();

  const active = tab === 'following' ? feedQuery : forYouQuery;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = active;

  const loadMoreRef = useInfiniteScroll(!!hasNextPage, isFetchingNextPage, fetchNextPage);

  const handlePostCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    queryClient.invalidateQueries({ queryKey: ['forYouFeed'] });
  }, [queryClient]);

  const handlePostDeleted = useCallback((postId: string) => {
    const key = tab === 'following' ? 'feed' : 'forYouFeed';
    queryClient.setQueryData<{ pages: PaginatedResponse<Post>[]; pageParams: unknown[] }>([key], (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: page.data.filter((p) => p.id !== postId),
        })),
      };
    });
  }, [queryClient, tab]);

  const posts = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div>
      <PostComposer onPostCreated={handlePostCreated} />

      <div className={styles.tabs}>
        <button
          className={tab === 'following' ? styles.tabActive : styles.tab}
          onClick={() => setTab('following')}
        >
          Following
        </button>
        <button
          className={tab === 'forYou' ? styles.tabActive : styles.tab}
          onClick={() => setTab('forYou')}
        >
          For You
        </button>
      </div>

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

      {!isLoading && !isError && posts.length === 0 && tab === 'following' && (
        <div className={styles.emptyState}>
          <EmptyFeedSvg />
          <h3>No posts yet</h3>
          <p>Be the first to share something.</p>
        </div>
      )}

      {!isLoading && !isError && posts.length === 0 && tab === 'forYou' && (
        <div className={styles.emptyState}>
          <EmptyFeedSvg />
          <h3>No recommendations yet</h3>
          <p>Explore topics to personalize your For You feed.</p>
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
