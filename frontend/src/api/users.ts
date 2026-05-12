import type { UserProfile, PublicProfile, PaginatedResponse } from '@/types';
import { api } from './client';

export async function fetchProfile(): Promise<UserProfile> {
  return api.get<UserProfile>('/api/users/profiles/get');
}

export async function updateProfile(data: Partial<Pick<UserProfile, 'bio' | 'display_name'>>): Promise<UserProfile> {
  return api.put<UserProfile>('/api/users/profiles/update', data);
}

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  return api.get<PublicProfile>(`/api/users/profiles/getpublic?username=${encodeURIComponent(username)}`);
}

export async function uploadAvatar(file: File): Promise<UserProfile> {
  const formData = new FormData();
  formData.append('image', file);
  return api.post<UserProfile>('/api/users/changeprofilepic', formData);
}

export async function searchUsers(query: string, cursor?: string): Promise<PaginatedResponse<UserProfile>> {
  const params = new URLSearchParams({ q: query });
  if (cursor) params.set('cursor', cursor);
  return api.get<PaginatedResponse<UserProfile>>(`/api/users/search?${params}`);
}

export async function followUser(userId: string): Promise<{ message: string }> {
  return api.post<{ message: string }>(`/api/users/${userId}/follow`);
}

export async function unfollowUser(userId: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/api/users/${userId}/follow`);
}

export async function getFollowers(userId: string, cursor?: string): Promise<PaginatedResponse<{ user_id: string; username: string; avatar_url: string | null }>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return api.get(`/api/users/${userId}/followers?${params}`);
}

export async function getFollowing(userId: string, cursor?: string): Promise<PaginatedResponse<{ user_id: string; username: string; avatar_url: string | null }>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return api.get(`/api/users/${userId}/following?${params}`);
}
