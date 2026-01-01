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

export const validateToken = async (): Promise<boolean> => {
  const { jwtToken } = getTokens();
  if (!jwtToken) return false;

  try {
    const response = await fetch("http://localhost/api/auth/validate", {
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
