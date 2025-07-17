// This utility assumes you store your auth token in localStorage upon login.
// If you use another method, you'll need to adjust this file.

/**
 * Retrieves the authentication token from localStorage.
 * @returns {string|null} The auth token or null if not found.
 */
export function getAuthToken() {
  const token = localStorage.getItem('authToken');
  return token;
}

/**
 * Saves the authentication token to localStorage.
 * @param {string} token - The token to save.
 */
export function setAuthToken(token) {
  if (!token) {
    return;
  }
  localStorage.setItem('authToken', token);
}

/**
 * Removes the authentication token from localStorage.
 */
export function removeAuthToken() {
  localStorage.removeItem('authToken');
}