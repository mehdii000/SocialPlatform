import { getTokens } from "./auth";
import { authenticatedFetch } from "./auth";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  bio: string;
  profile_picture_url: string | null;
  account_status: string;
  created_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  username: string;
  content: string;
  media_url: string | null;
  media_type: number | 0;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked: boolean | false;
}

export const fetchProfile = async (): Promise<UserProfile> => {
  const { jwtToken } = getTokens();
  
  const response = await authenticatedFetch("http://localhost/api/users/profiles/get", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }

  return response.json();
};

export const updateProfile = async (data: Partial<UserProfile>): Promise<UserProfile> => {
  const { jwtToken } = getTokens();
  
  const response = await authenticatedFetch("http://localhost/api/users/profiles/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update profile");
  }

  return response.json();
};

export const fetchPosts = async (): Promise<Post[]> => {
  const { jwtToken } = getTokens();
  
  const response = await authenticatedFetch("http://localhost/api/posts/getposts", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch posts");
  }

  return response.json();
};

export const fetchUserPosts = async (userId: number): Promise<Post[]> => {
  const { jwtToken } = getTokens();
  
  const response = await authenticatedFetch(`http://localhost/api/posts/getposts/${userId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user posts");
  }

  return response.json();
};

export const createPost = async (
  text: string,
  mediaFile: File | null,
  mediaType: "image" | "video" | null
): Promise<{ message: string; post_id: number }> => {
  const { jwtToken } = getTokens();
  
  const formData = new FormData();
  formData.append("text", text);
  
  if (mediaFile && mediaType === "image") {
    formData.append("image", mediaFile);
  } else if (mediaFile && mediaType === "video") {
    formData.append("video", mediaFile);
  }
  
  const response = await authenticatedFetch("http://localhost/api/posts/createpost", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwtToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to create post");
  }

  return response.json();
};

export const likePost = async (postId: number): Promise<{ message: string; likes_count: number }> => {
  const { jwtToken } = getTokens();
  const response = await authenticatedFetch(`http://localhost/api/posts/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ post_id: postId }),
  });

  if (!response.ok) {
    throw new Error("Failed to like post");
  }

  return response.json();
};

export const deletePost = async (postId: number): Promise<{ message: string }> => {
  const { jwtToken } = getTokens();
  const response = await authenticatedFetch(`http://localhost/api/posts/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ post_id: postId }),
  });

  if (!response.ok) {
    throw new Error("Failed to delete post");
  }

  return response.json();
};

export const changeProfilePicture = async (imageFile: File): Promise<UserProfile> => {
  const { jwtToken } = getTokens();
  
  const formData = new FormData();
  formData.append("image", imageFile);
  
  const response = await authenticatedFetch("http://localhost/api/users/changeprofilepic", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwtToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to change profile picture");
  }

  return response.json();
};

export const fetchPost = async (postId: number): Promise<Post> => {
  const { jwtToken } = getTokens();
  const response = await authenticatedFetch(`http://localhost/api/posts/get/${postId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch post");
  }

  return response.json();
};
