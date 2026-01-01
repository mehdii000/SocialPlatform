import { getTokens } from "./auth";
import { authenticatedFetch } from "./auth";

const API_BASE = "http://localhost/api";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  bio: string;
  profile_picture_url: string | null;
  account_status: string;
  created_at: string;
}

export const fetchProfile = async (): Promise<UserProfile> => {
  const { jwtToken } = getTokens();
  
  const response = await authenticatedFetch(`${API_BASE}/profiles/get`, {
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
  
  const response = await authenticatedFetch(`${API_BASE}/profiles/update`, {
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
