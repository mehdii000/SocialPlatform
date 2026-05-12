import type { Conversation, Message } from '@/types';
import { api } from './client';

export async function fetchConversations(): Promise<Conversation[]> {
  return api.get<Conversation[]>('/api/messages/getconvo');
}

export async function fetchMessageHistory(convId: string, cursor?: string): Promise<Message[]> {
  const params = new URLSearchParams({ conv_id: convId });
  if (cursor) params.set('cursor', cursor);
  return api.get<Message[]>(`/api/messages/history?${params}`);
}

export async function createConversation(participantId: string): Promise<{ conversation_id: string }> {
  return api.post<{ conversation_id: string }>('/api/messages/conversations', { participant_id: participantId });
}
