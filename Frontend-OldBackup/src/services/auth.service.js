import apiClient from './client';

export const register = (email, password, role) => {
  return apiClient.post('/auth/register', { email, password, role });
};

export const login = (email, password) => {
  return apiClient.post('/auth/login', { email, password });
};

export const refresh = () => {
  return apiClient.post('/auth/refresh');
};

export const logout = () => {
  return apiClient.post('/auth/logout');
};

export const me = () => {
  return apiClient.get('/auth/me');
};
