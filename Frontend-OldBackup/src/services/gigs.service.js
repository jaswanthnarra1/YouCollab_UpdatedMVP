import apiClient from './client';

export const createGig = (data) => {
  return apiClient.post('/gigs', data);
};

export const getGigs = (params) => {
  return apiClient.get('/gigs', { params });
};

export const getGigById = (id) => {
  return apiClient.get(`/gigs/${id}`);
};

export const updateGig = (id, data) => {
  return apiClient.patch(`/gigs/${id}`, data);
};

export const closeGig = (id) => {
  return apiClient.delete(`/gigs/${id}`);
};

export const getMyGigs = () => {
  return apiClient.get('/gigs/mine');
};
