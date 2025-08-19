/**
 * Client-side authentication utilities with automatic token refresh and offline support
 */

import {
  offlineStore,
  OfflineUser,
  OfflineSession,
} from "@/core/database/offline-store";
import { developmentConfig } from "@/core/config/development.config";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  roles?: string[];
}

class AuthClient {
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshPromise: Promise<AuthTokens> | null = null;

  /**
   * Initialize auth client and set up auto-refresh
   */
  init() {
    // Check if we have tokens on load
    const accessToken = this.getAccessToken();
    const expiresIn = this.getTokenExpiry();

    if (accessToken && expiresIn > 0) {
      this.scheduleTokenRefresh(expiresIn);
    }

    // Listen for storage events (cross-tab sync)
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.handleStorageChange.bind(this));
    }
  }

  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refreshToken");
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(): number {
    if (typeof window === "undefined") return 0;
    const expiry = localStorage.getItem("tokenExpiry");
    return expiry ? parseInt(expiry) : 0;
  }

  /**
   * Get current user from localStorage with offline fallback
   */
  async getUser(): Promise<User | null> {
    if (typeof window === "undefined") return null;

    // Try localStorage first
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Cache in offline store
        await offlineStore.setUser(user);
        return user;
      } catch (error) {
        console.error(
          "[AuthClient] Failed to parse user from localStorage:",
          error,
        );
      }
    }

    // Try offline store
    const offlineUser = await offlineStore.getCurrentUser();
    if (offlineUser) {
      return {
        id: offlineUser.id,
        email: offlineUser.email,
        username: offlineUser.username,
        displayName: offlineUser.displayName || offlineUser.username,
        roles: offlineUser.roles,
      };
    }

    // Development mode fallback
    if (developmentConfig.enableMockData) {
      return {
        id: "dev_user",
        email: "dev@localhost.com",
        username: "dev_user",
        displayName: "Development User",
        roles: ["admin", "user"],
      };
    }

    return null;
  }

  /**
   * Check if user is authenticated (supports offline mode)
   */
  async isAuthenticated(): Promise<boolean> {
    // In offline mode with mock data, always authenticated
    if (
      developmentConfig.enableOfflineMode &&
      developmentConfig.enableMockData
    ) {
      return true;
    }

    const token = this.getAccessToken();
    const expiry = this.getTokenExpiry();

    // Check token validity
    const tokenValid = !!token && (expiry === -1 || expiry > Date.now());

    if (tokenValid) {
      return true;
    }

    // Check if we have a user in offline store
    const user = await this.getUser();
    return !!user;
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresIn: number) {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // If token never expires, don't schedule refresh
    if (expiresIn === -1) {
      return;
    }

    // Calculate when to refresh (80% of token lifetime)
    const refreshIn = Math.max(expiresIn * 0.8 * 1000, 30000); // Min 30 seconds

    this.refreshTimer = setTimeout(() => {
      this.refreshTokens();
    }, refreshIn);
  }

  /**
   * Refresh access token using refresh token (with offline fallback)
   */
  async refreshTokens(): Promise<AuthTokens> {
    // If already refreshing, return existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // In offline mode, return mock tokens
    if (developmentConfig.enableOfflineMode || offlineStore.isOffline()) {
      const mockTokens: AuthTokens = {
        accessToken: "mock_access_token_" + Date.now(),
        refreshToken: "mock_refresh_token_" + Date.now(),
        expiresIn: -1, // Never expires in offline mode
      };
      this.storeTokens(mockTokens);
      return mockTokens;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      // In development, generate mock tokens
      if (developmentConfig.enableMockData) {
        const mockTokens: AuthTokens = {
          accessToken: "dev_access_token_" + Date.now(),
          refreshToken: "dev_refresh_token_" + Date.now(),
          expiresIn: 3600,
        };
        this.storeTokens(mockTokens);
        return mockTokens;
      }
      throw new Error("No refresh token available");
    }

    this.refreshPromise = fetch("/api/ums/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Token refresh failed");
        }

        const data = await response.json();

        if (data.success) {
          // Store new tokens
          this.storeTokens(data.tokens);

          // Schedule next refresh
          if (data.tokens.expiresIn > 0) {
            this.scheduleTokenRefresh(data.tokens.expiresIn);
          }

          return data.tokens;
        } else {
          throw new Error(data.error || "Token refresh failed");
        }
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  /**
   * Store tokens in localStorage
   */
  storeTokens(tokens: AuthTokens) {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);

    // Store expiry time as timestamp
    const expiryTime =
      tokens.expiresIn === -1 ? -1 : Date.now() + tokens.expiresIn * 1000;
    localStorage.setItem("tokenExpiry", expiryTime.toString());
  }

  /**
   * Clear all auth data
   */
  logout() {
    // Clear timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear storage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("tokenExpiry");
    localStorage.removeItem("user");

    // Clear cookies
    document.cookie =
      "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }

  /**
   * Handle storage changes (cross-tab sync)
   */
  private handleStorageChange(e: StorageEvent) {
    if (e.key === "accessToken" && !e.newValue) {
      // Token was removed (logout in another tab)
      this.logout();
      window.location.href = "/login";
    } else if (e.key === "accessToken" && e.newValue) {
      // Token was updated (login or refresh in another tab)
      const expiresIn = this.getTokenExpiry();
      if (expiresIn > 0) {
        this.scheduleTokenRefresh(expiresIn);
      }
    }
  }

  /**
   * Make an authenticated API request with automatic token refresh and offline support
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Check if we're in offline mode
    if (developmentConfig.enableOfflineMode || offlineStore.isOffline()) {
      // Return mock response for certain endpoints
      if (url.includes("/api/ums/users/me")) {
        const user = await this.getUser();
        return new Response(JSON.stringify({ success: true, user }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Ensure we have a valid token
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      try {
        await this.refreshTokens();
      } catch (error) {
        // In development, continue without auth
        if (developmentConfig.enableMockData) {
          console.warn(
            "[AuthClient] Authentication failed, continuing in mock mode",
          );
        } else {
          // Redirect to login if refresh fails
          window.location.href = "/login";
          throw error;
        }
      }
    }

    // Get current token
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      throw new Error("No access token available");
    }

    // Add auth header
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    };

    // Make request
    const response = await fetch(url, { ...options, headers });

    // If unauthorized, try refreshing token once
    if (response.status === 401) {
      try {
        await this.refreshTokens();

        // Retry request with new token
        const newToken = this.getAccessToken();
        headers["Authorization"] = `Bearer ${newToken}`;
        return fetch(url, { ...options, headers });
      } catch (error) {
        // Redirect to login if refresh fails
        window.location.href = "/login";
        throw error;
      }
    }

    return response;
  }

  /**
   * Store user data with offline sync
   */
  async storeUser(user: User): Promise<void> {
    if (typeof window === "undefined") return;

    // Store in localStorage
    localStorage.setItem("user", JSON.stringify(user));

    // Store in offline store if available
    if (typeof window !== "undefined" && window.localStorage) {
      const offlineUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName || user.username,
        roles: user.roles || [],
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("offline_user", JSON.stringify(offlineUser));
    }
  }
}

// Export singleton instance
export const authClient = new AuthClient();

// Initialize on load
if (typeof window !== "undefined") {
  authClient.init();
}
