export interface UserProfile {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  user_id: string;
  username: string;
  bio: string;
  avatar_url: string | null;
}

export interface Post {
  id: string;
  user_id: string;
  username: string;
  content: string;
  media_url: string | null;
  media_type: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  username: string;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  from: string;
  avatar: string | null;
  msg: string | null;
  timestamp: string | null;
}

export interface Message {
  id: string;
  from: string;
  content: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  next_cursor: string | null;
  total: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  jwt_token: string;
}

export interface WSMessage {
  type: 'message' | 'typing';
  id?: string;
  conversation_id?: string;
  sender_id?: string;
  content?: string;
  created_at?: string;
}
