import apiClient from './client';

export const apply = (data) => {
  return apiClient.post('/applications', data);
};

export const listApplicants = (gigId, params) => {
  return apiClient.get(`/applications/gig/${gigId}`, { params });
};

export const listMyApplications = (params) => {
  return apiClient.get('/applications/me', { params });
};

export const updateStatus = (id, status) => {
  return apiClient.patch(`/applications/${id}/status`, { status });
};
