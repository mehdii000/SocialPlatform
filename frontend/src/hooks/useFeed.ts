import { useCallback, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchFeed } from '@/api/posts';
import type { Post } from '@/types';

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => fetchFeed(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  });
}

export function useInfiniteScroll(
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void
) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  return useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node || !hasNextPage || isFetchingNextPage) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );
}
