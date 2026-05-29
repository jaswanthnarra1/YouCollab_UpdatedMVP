import apiClient from './client';

export const onboardBrand = (data) => {
  return apiClient.post('/onboarding/brand', data);
};

export const onboardInfluencer = (data) => {
  return apiClient.post('/onboarding/influencer', data);
};
