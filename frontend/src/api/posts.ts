import type { Post, Comment, PaginatedResponse } from '@/types';
import { api } from './client';

export async function fetchFeed(cursor?: string): Promise<PaginatedResponse<Post>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return api.get<PaginatedResponse<Post>>(`/api/posts/feed?${params}`);
}

export async function fetchAllPosts(cursor?: string): Promise<PaginatedResponse<Post>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return api.get<PaginatedResponse<Post>>(`/api/posts/getposts?${params}`);
}

export async function fetchPost(postId: string): Promise<Post> {
  return api.get<Post>(`/api/posts/get/${postId}`);
}

export async function createPost(text: string, imageFile?: File): Promise<{ message: string; post_id: string }> {
  const formData = new FormData();
  formData.append('text', text);
  if (imageFile) formData.append('image', imageFile);
  return api.post<{ message: string; post_id: string }>('/api/posts/createpost', formData);
}

export async function likePost(postId: string): Promise<{ message: string; likes_count: number }> {
  return api.post<{ message: string; likes_count: number }>('/api/posts/like', { post_id: postId });
}

export async function deletePost(postId: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/posts/delete', { post_id: postId });
}

export async function fetchComments(postId: string, cursor?: string): Promise<PaginatedResponse<Comment>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return api.get<PaginatedResponse<Comment>>(`/api/posts/${postId}/comments?${params}`);
}

export async function createComment(postId: string, content: string): Promise<Comment> {
  return api.post<Comment>(`/api/posts/${postId}/comments`, { content });
}

export async function deleteComment(commentId: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/api/posts/comments/${commentId}`);
}

export async function fetchUserPosts(userId: string, cursor?: string): Promise<PaginatedResponse<Post>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return api.get<PaginatedResponse<Post>>(`/api/posts/getposts/${userId}?${params}`);
}
