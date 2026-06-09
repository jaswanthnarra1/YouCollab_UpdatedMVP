import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../services/auth.service';
import * as onboardingApi from '../services/onboarding.service';
import useAuthStore from '../stores/authStore';
import useUiStore from '../stores/uiStore';

/**
 * Hook to manage all Authentication and User Onboarding queries/mutations.
 */
export const useAuth = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const addToast = useUiStore((state) => state.addToast);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => authApi.login(email, password),
    onSuccess: (response) => {
      const { user, accessToken } = response.data;
      setAuth(user, accessToken);
      addToast(`Welcome back, ${user.brand?.businessName || user.influencer?.name || 'friend'}! 👋`, 'success');
      
      if (!user.isOnboarded) {
        navigate(user.role === 'BRAND' ? '/onboarding/brand' : '/onboarding/influencer');
      } else {
        navigate(user.role === 'BRAND' ? '/dashboard/brand' : '/dashboard/influencer');
      }
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Oops, failed to sign in. Check your credentials.';
      addToast(message, 'error');
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: ({ email, password, role }) => authApi.register(email, password, role),
    onSuccess: (response) => {
      const { user, accessToken } = response.data;
      setAuth(user, accessToken);
      addToast("Account created successfully! Let's get onboarded. 🚀", 'success');
      navigate(user.role === 'BRAND' ? '/onboarding/brand' : '/onboarding/influencer');
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Failed to create account. Try another email.';
      addToast(message, 'error');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearAuth();
      queryClient.clear(); // wipe cached React Query data
      addToast('Signed out successfully. See you soon! 👋', 'success');
      navigate('/');
    },
    onError: () => {
      clearAuth();
      queryClient.clear();
      navigate('/');
    },
  });

  // Fetch current user details
  const useCurrentUser = (options = {}) => {
    return useQuery({
      queryKey: ['auth', 'me'],
      queryFn: async () => {
        try {
          const response = await authApi.me();
          const { user } = response.data;
          setAuth(user, useAuthStore.getState().accessToken);
          return user;
        } catch (error) {
          clearAuth();
          throw error;
        }
      },
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      ...options,
    });
  };

  // Brand onboarding mutation
  const onboardBrandMutation = useMutation({
    mutationFn: onboardingApi.onboardBrand,
    onSuccess: (response) => {
      const { user } = response.data;
      // Refresh user store with onboarded details
      setAuth(user, useAuthStore.getState().accessToken);
      addToast('Onboarding completed! Welcome to YouCollab! 🏢🎉', 'success');
      navigate(user.role === 'BRAND' ? '/dashboard/brand' : '/dashboard/influencer');
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Failed to complete brand profile.';
      addToast(message, 'error');
    },
  });

  // Influencer/Creator onboarding mutation
  const onboardInfluencerMutation = useMutation({
    mutationFn: onboardingApi.onboardInfluencer,
    onSuccess: (response) => {
      const { user } = response.data;
      setAuth(user, useAuthStore.getState().accessToken);
      addToast('Creator profile set up! Time to get collabs! 🎨✨', 'success');
      navigate(user.role === 'BRAND' ? '/dashboard/brand' : '/dashboard/influencer');
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Failed to complete creator profile.';
      addToast(message, 'error');
    },
  });

  return {
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    useCurrentUser,
    onboardBrand: onboardBrandMutation.mutate,
    isOnboardingBrand: onboardBrandMutation.isPending,
    onboardInfluencer: onboardInfluencerMutation.mutate,
    isOnboardingInfluencer: onboardInfluencerMutation.isPending,
  };
};
