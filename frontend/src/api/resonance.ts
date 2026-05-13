import type { Topic, TrendingTopic, TopicTag, UserInterest, GraphData, PaginatedResponse, Post } from '@/types';
import { api } from './client';

export async function fetchTopics(): Promise<{ data: Topic[]; total: number }> {
  return api.get('/api/resonance/topics');
}

export async function fetchTopic(slug: string): Promise<Topic> {
  return api.get(`/api/resonance/topics/${slug}`);
}

export async function fetchTrendingTopics(): Promise<{ data: TrendingTopic[] }> {
  return api.get('/api/resonance/topics/trending');
}

export async function fetchTopicPosts(slug: string, cursor?: string, sort?: 'recent' | 'top'): Promise<PaginatedResponse<Post>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (sort) params.set('sort', sort);
  return api.get(`/api/resonance/topics/${slug}/posts?${params}`);
}

export async function followTopic(slug: string): Promise<{ message: string }> {
  return api.post(`/api/resonance/topics/${slug}/follow`);
}

export async function unfollowTopic(slug: string): Promise<{ message: string }> {
  return api.delete(`/api/resonance/topics/${slug}/follow`);
}

export async function fetchForYouFeed(cursor?: string): Promise<PaginatedResponse<Post>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return api.get(`/api/resonance/feed/for-you?${params}`);
}

export async function fetchInterests(): Promise<{ data: UserInterest[] }> {
  return api.get('/api/resonance/interests');
}

export async function updateInterests(topics: { slug: string; weight: number }[]): Promise<{ data: UserInterest[] }> {
  return api.put('/api/resonance/interests', { topics });
}

export async function extractTopics(postId: string, content: string): Promise<{ topics: TopicTag[] }> {
  return api.post('/api/resonance/extract', { post_id: postId, content });
}

export async function fetchPostTopics(postId: string): Promise<{ topics: TopicTag[] }> {
  return api.get(`/api/resonance/posts/${postId}/topics`);
}

export async function engage(postId: string, action: 'like' | 'comment' | 'create'): Promise<{ message: string }> {
  return api.post('/api/resonance/interests/engage', { post_id: postId, action });
}

export async function fetchGraph(): Promise<GraphData> {
  return api.get('/api/resonance/graph');
}
