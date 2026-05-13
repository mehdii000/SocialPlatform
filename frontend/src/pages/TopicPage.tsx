import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Hash, Plus, Check } from 'lucide-react';
import { fetchTopic, fetchTopicPosts, followTopic, unfollowTopic } from '@/api/resonance';
import { PostCard } from '@/components/features/posts/PostCard';
import { PostSkeleton } from '@/components/ui/Skeleton';
import { useInfiniteScroll } from '@/hooks/useForYouFeed';
import { formatCount } from '@/utils/format';
import type { Post } from '@/types';
import styles from './TopicPage.module.css';

export default function TopicPage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<'recent' | 'top'>('recent');

  const { data: topic, isLoading: topicLoading } = useQuery({
    queryKey: ['topic', slug],
    queryFn: () => fetchTopic(slug!),
    enabled: !!slug,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: postsLoading, isError, refetch } = useInfiniteQuery({
    queryKey: ['topicPosts', slug, sort],
    queryFn: ({ pageParam }) => fetchTopicPosts(slug!, pageParam as string | undefined, sort),
    enabled: !!slug,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
    staleTime: 30_000,
  });

  const loadMoreRef = useInfiniteScroll(!!hasNextPage, isFetchingNextPage, fetchNextPage);

  const followMut = useMutation({
    mutationFn: () => followTopic(slug!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interests'] });
      queryClient.invalidateQueries({ queryKey: ['topic', slug] });
    },
  });

  const unfollowMut = useMutation({
    mutationFn: () => unfollowTopic(slug!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interests'] });
      queryClient.invalidateQueries({ queryKey: ['topic', slug] });
    },
  });

  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (topic) {
      setIsFollowing(topic.is_following);
    }
  }, [topic]);

  const handleToggleFollow = useCallback(() => {
    if (isFollowing) {
      setIsFollowing(false);
      unfollowMut.mutate();
    } else {
      setIsFollowing(true);
      followMut.mutate();
    }
  }, [isFollowing, followMut, unfollowMut]);

  const posts = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  return (
    <div className={styles.page}>
      {topicLoading && (
        <div className={styles.headerSkeleton}>
          <div className={styles.skelTitle} />
          <div className={styles.skelDesc} />
        </div>
      )}

      {topic && (
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.titleRow}>
              <Hash size={24} className={styles.hashIcon} />
              <h1>{topic.name}</h1>
            </div>
            <button
              className={isFollowing ? styles.following : styles.follow}
              onClick={handleToggleFollow}
            >
              {isFollowing ? <Check size={14} /> : <Plus size={14} />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
          {topic.description && <p className={styles.description}>{topic.description}</p>}
          <p className={styles.count}>{formatCount(topic.post_count)} posts</p>
        </div>
      )}

      <div className={styles.tabs}>
        <button
          className={sort === 'recent' ? styles.tabActive : styles.tab}
          onClick={() => setSort('recent')}
        >
          Recent
        </button>
        <button
          className={sort === 'top' ? styles.tabActive : styles.tab}
          onClick={() => setSort('top')}
        >
          Top
        </button>
      </div>

      {postsLoading && (
        <div className={styles.skeletonList}>
          {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
        </div>
      )}

      {isError && (
        <div className={styles.errorState}>
          <p>Failed to load posts.</p>
          <button onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {!postsLoading && !isError && posts.length === 0 && (
        <div className={styles.emptyState}>
          <Hash size={48} />
          <h3>No posts yet</h3>
          <p>Be the first to post in this topic.</p>
        </div>
      )}

      <div className={styles.postList}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <div ref={loadMoreRef} style={{ height: 1 }} />
      {isFetchingNextPage && <PostSkeleton />}
    </div>
  );
}
