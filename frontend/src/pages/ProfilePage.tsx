import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getPublicProfile, fetchProfile, followUser, unfollowUser, getFollowers, getFollowing } from '@/api/users';
import { fetchUserPosts } from '@/api/posts';
import { PostCard } from '@/components/features/posts/PostCard';
import { ProfileHeader } from '@/components/features/users/ProfileHeader';
import { FollowList } from '@/components/features/users/FollowList';
import { PostSkeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/hooks/useAuth';
import { useInfiniteScroll } from '@/hooks/useFeed';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const myId = useAuthStore((s) => s.userId);
  const [tab, setTab] = useState<'posts'>('posts');
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followListType, setFollowListType] = useState<'followers' | 'following' | null>(null);

  const { data: myProfile } = useQuery({
    queryKey: ['myProfile'],
    queryFn: fetchProfile,
    enabled: !!myId,
  });

  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => getPublicProfile(username!),
    enabled: !!username,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['userPosts', profile?.user_id],
    queryFn: ({ pageParam }) => fetchUserPosts(profile!.user_id, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
    enabled: !!profile?.user_id,
  });

  const { data: followersData } = useQuery({
    queryKey: ['followers', profile?.user_id],
    queryFn: () => getFollowers(profile!.user_id),
    enabled: !!profile?.user_id,
  });

  const { data: followingData } = useQuery({
    queryKey: ['following', profile?.user_id],
    queryFn: () => getFollowing(profile!.user_id),
    enabled: !!profile?.user_id,
  });

  const isOwn = myProfile?.user_id === profile?.user_id;
  const isFollowing = profile?.is_following ?? false;
  const followersCount = profile?.followers_count ?? followersData?.total ?? 0;
  const followingCount = profile?.following_count ?? followingData?.total ?? 0;

  const loadMoreRef = useInfiniteScroll(!!hasNextPage, isFetchingNextPage, fetchNextPage);

  const posts = data?.pages.flatMap((p) => p.data) ?? [];

  const handleFollow = useCallback(async () => {
    if (!profile) return;
    setIsFollowLoading(true);
    try {
      await followUser(profile.user_id);
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      queryClient.invalidateQueries({ queryKey: ['followers', profile.user_id] });
    } catch {}
    setIsFollowLoading(false);
  }, [profile, queryClient, username]);

  const handleUnfollow = useCallback(async () => {
    if (!profile) return;
    setIsFollowLoading(true);
    try {
      await unfollowUser(profile.user_id);
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      queryClient.invalidateQueries({ queryKey: ['followers', profile.user_id] });
    } catch {}
    setIsFollowLoading(false);
  }, [profile, queryClient, username]);

  const handleMessage = useCallback(() => {
    navigate('/messages', { state: { newChatUsername: profile?.username } });
  }, [navigate, profile]);

  if (profileLoading) {
    return <div className={styles.center}><div className={styles.loader} /></div>;
  }

  if (profileError || !profile) {
    return (
      <div className={styles.center}>
        <p className={styles.notFound}>User not found.</p>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  return (
    <div>
      <ProfileHeader
        profile={profile}
        followersCount={followersCount}
        followingCount={followingCount}
        isFollowing={isFollowing}
        isOwn={isOwn}
        followLoading={isFollowLoading}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        onMessage={handleMessage}
        onEdit={() => navigate(`/profiles/${profile?.username}`)}
        onFollowersClick={() => setFollowListType('followers')}
        onFollowingClick={() => setFollowListType('following')}
      />

      <div className={styles.tabs}>
        <button
          className={tab === 'posts' ? styles.tabActive : styles.tab}
          onClick={() => setTab('posts')}
        >
          Posts
        </button>
      </div>

      <div className={styles.postList}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onDelete={() => queryClient.invalidateQueries({ queryKey: ['userPosts', profile?.user_id] })} />
        ))}
        {posts.length === 0 && !isFetchingNextPage && (
          <p className={styles.emptyText}>No posts yet.</p>
        )}
        {isFetchingNextPage && <PostSkeleton />}
        <div ref={loadMoreRef} style={{ height: 1 }} />
      </div>

      {followListType && (
        <FollowList
          userId={profile.user_id}
          type={followListType}
          followers={followersData?.data ?? []}
          following={followingData?.data ?? []}
          onClose={() => setFollowListType(null)}
        />
      )}
    </div>
  );
}
