export const storeTokens = (jwtToken: string, refreshToken: string) => {
  localStorage.setItem("jwt_token", jwtToken);
  localStorage.setItem("refresh_token", refreshToken);
};

export const getTokens = () => ({
  jwtToken: localStorage.getItem("jwt_token"),
  refreshToken: localStorage.getItem("refresh_token"),
});

export const clearTokens = () => {
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("refresh_token");
};

export const refreshAccessToken = async (): Promise<boolean> => {
  const { refreshToken } = getTokens();
  if (!refreshToken) return false;

  try {
    const response = await fetch("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      storeTokens(data.access_token, refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const validateToken = async (): Promise<boolean> => {
  const { jwtToken } = getTokens();
  if (!jwtToken) return false;

  try {
    const response = await authenticatedFetch("http://localhost/api/auth/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({}),
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const isAuthenticated = () => {
  const { jwtToken } = getTokens();
  return !!jwtToken;
};

/**
 * Wrapper for fetch that automatically refreshes the JWT token if it expires (401)
 * and retries the request with the new token
 */
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const { jwtToken } = getTokens();

  // Add Authorization header if JWT token exists
  const headers = {
    ...options.headers,
    ...(jwtToken && { Authorization: `Bearer ${jwtToken}` }),
  };

  let response = await fetch(url, { ...options, headers });

  // If unauthorized (401), try to refresh the token and retry
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const { jwtToken: newToken } = getTokens();
      const retryHeaders = {
        ...options.headers,
        ...(newToken && { Authorization: `Bearer ${newToken}` }),
      };
      response = await fetch(url, { ...options, headers: retryHeaders });
    }
  }

  return response;
};
