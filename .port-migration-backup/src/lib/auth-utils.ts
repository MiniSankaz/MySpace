// Authentication utilities for microservices integration

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user_data";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
}

// Token management
export function saveTokens(tokens: AuthTokens): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

    // Set expiry time
    const expiryTime = Date.now() + tokens.expiresIn * 1000;
    localStorage.setItem("token_expiry", expiryTime.toString());
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
}

export function clearTokens(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem("token_expiry");
    localStorage.removeItem(USER_KEY);
  }
}

// User management
export function saveUser(user: User): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getUser(): User | null {
  if (typeof window !== "undefined") {
    const userData = localStorage.getItem(USER_KEY);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Token validation
export function isTokenExpired(token?: string): boolean {
  const authToken = token || getAuthToken();
  if (!authToken) return true;

  if (typeof window !== "undefined") {
    const expiryTime = localStorage.getItem("token_expiry");
    if (expiryTime) {
      return Date.now() > parseInt(expiryTime);
    }
  }

  // Decode JWT to check expiry
  try {
    const payload = JSON.parse(atob(authToken.split(".")[1]));
    if (payload.exp) {
      return Date.now() >= payload.exp * 1000;
    }
  } catch {
    return true;
  }

  return false;
}

// Refresh token
export async function refreshAuthToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000"}/api/v1/auth/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      },
    );

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        saveTokens(data.data);
        return data.data.accessToken;
      }
    }
  } catch (error) {
    console.error("Failed to refresh token:", error);
  }

  // Clear tokens if refresh failed
  clearTokens();
  return null;
}

// Login function
export async function login(
  email: string,
  password: string,
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000"}/api/v1/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      },
    );

    const data = await response.json();

    if (data.success && data.data) {
      // Save tokens
      if (data.data.tokens) {
        saveTokens(data.data.tokens);
      }

      // Save user data
      if (data.data.user) {
        saveUser(data.data.user);
        return { success: true, user: data.data.user };
      }
    }

    return { success: false, error: data.error || "Login failed" };
  } catch (error: any) {
    return { success: false, error: error.message || "Network error" };
  }
}

// Logout function
export async function logout(): Promise<void> {
  const token = getAuthToken();

  if (token) {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000"}/api/v1/auth/logout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    } catch {
      // Ignore logout errors
    }
  }

  clearTokens();

  // Redirect to login page
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  return token !== null && !isTokenExpired();
}

// Get authorization header
export function getAuthHeader(): { Authorization: string } | {} {
  const token = getAuthToken();
  if (token && !isTokenExpired()) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
