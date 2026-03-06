/**
 * Auth Token Management
 * Handle token storage and retrieval for client-side authentication
 */

const TOKEN_KEY = 'bakery_auth_token';

export const authToken = {
  /**
   * Get auth token from localStorage
   */
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Set auth token to localStorage
   */
  set: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Remove auth token from localStorage
   */
  remove: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  },

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated: (): boolean => {
    return !!authToken.get();
  },
};
