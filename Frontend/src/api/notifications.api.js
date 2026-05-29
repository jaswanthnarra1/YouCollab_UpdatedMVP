import apiClient from './client';

export const list = (params) => {
  return apiClient.get('/notifications', { params });
};

export const read = (id) => {
  return apiClient.patch(`/notifications/${id}/read`);
};

export const readAll = () => {
  return apiClient.patch('/notifications/read');
};

export const count = () => {
  return apiClient.get('/notifications/unread-count');
};
