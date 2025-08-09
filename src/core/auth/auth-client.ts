/**
 * Client-side authentication utilities with automatic token refresh
 */

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
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
    }
  }

  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(): number {
    if (typeof window === 'undefined') return 0;
    const expiry = localStorage.getItem('tokenExpiry');
    return expiry ? parseInt(expiry) : 0;
  }

  /**
   * Get current user from localStorage
   */
  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const expiry = this.getTokenExpiry();
    
    // If token never expires (expiry === -1) or hasn't expired yet
    return !!token && (expiry === -1 || expiry > Date.now());
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
   * Refresh access token using refresh token
   */
  async refreshTokens(): Promise<AuthTokens> {
    // If already refreshing, return existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = fetch('/api/ums/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Token refresh failed');
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
          throw new Error(data.error || 'Token refresh failed');
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
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    
    // Store expiry time as timestamp
    const expiryTime = tokens.expiresIn === -1 
      ? -1 
      : Date.now() + (tokens.expiresIn * 1000);
    localStorage.setItem('tokenExpiry', expiryTime.toString());
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('user');

    // Clear cookies
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }

  /**
   * Handle storage changes (cross-tab sync)
   */
  private handleStorageChange(e: StorageEvent) {
    if (e.key === 'accessToken' && !e.newValue) {
      // Token was removed (logout in another tab)
      this.logout();
      window.location.href = '/login';
    } else if (e.key === 'accessToken' && e.newValue) {
      // Token was updated (login or refresh in another tab)
      const expiresIn = this.getTokenExpiry();
      if (expiresIn > 0) {
        this.scheduleTokenRefresh(expiresIn);
      }
    }
  }

  /**
   * Make an authenticated API request with automatic token refresh
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Ensure we have a valid token
    if (!this.isAuthenticated()) {
      try {
        await this.refreshTokens();
      } catch (error) {
        // Redirect to login if refresh fails
        window.location.href = '/login';
        throw error;
      }
    }

    // Get current token
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    // Add auth header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    };

    // Make request
    const response = await fetch(url, { ...options, headers });

    // If unauthorized, try refreshing token once
    if (response.status === 401) {
      try {
        await this.refreshTokens();
        
        // Retry request with new token
        const newToken = this.getAccessToken();
        headers['Authorization'] = `Bearer ${newToken}`;
        return fetch(url, { ...options, headers });
      } catch (error) {
        // Redirect to login if refresh fails
        window.location.href = '/login';
        throw error;
      }
    }

    return response;
  }
}

// Export singleton instance
export const authClient = new AuthClient();

// Initialize on load
if (typeof window !== 'undefined') {
  authClient.init();
}