/**
 * Centralized authentication utility functions
 * Handles token management in a single location
 */

/**
 * Get the access token from storage
 * @returns The access token string or null if not found
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

/**
 * Get the refresh token from storage
 * @returns The refresh token string or null if not found
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

/**
 * Set both access and refresh tokens
 * @param accessToken The access token
 * @param refreshToken The refresh token
 */
export const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

/**
 * Clear all authentication tokens
 */
export const clearTokens = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

/**
 * Check if user is authenticated (has a valid token)
 * @returns True if user has an access token
 */
export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

