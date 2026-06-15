/**
 * YouCollab — Instagram API Service (Frontend)
 * ==============================================
 * Thin wrappers over apiClient for Instagram endpoints.
 */

import apiClient from './client';

/**
 * Get the Meta OAuth URL to redirect the user to.
 * @returns {Promise<{ url: string, state: string }>}
 */
export const getConnectUrl = () => {
  return apiClient.get('/instagram/connect');
};

/**
 * Complete the OAuth callback by sending code + state to backend.
 * @param {string} code
 * @param {string} state
 */
export const handleCallback = (code, state) => {
  return apiClient.get('/instagram/callback', { params: { code, state } });
};

/**
 * Trigger a fresh sync of Instagram metrics from the Graph API.
 */
export const syncInstagram = () => {
  return apiClient.post('/instagram/sync');
};

/**
 * Disconnect the linked Instagram account.
 */
export const disconnectInstagram = () => {
  return apiClient.delete('/instagram/disconnect');
};

/**
 * Retrieve the cached Instagram profile from DB (no API call).
 */
export const getIgProfile = () => {
  return apiClient.get('/instagram/profile');
};
