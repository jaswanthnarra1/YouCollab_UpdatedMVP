import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';

export const OnboardingGuard = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated && user && !user.isOnboarded) {
    // If user is logged in but hasn't onboarded, force redirect to onboarding routes
    const onboardingPath = user.role === 'BRAND' ? '/onboarding/brand' : '/onboarding/influencer';
    
    // Avoid infinite redirect loops
    if (location.pathname !== onboardingPath) {
      return <Navigate to={onboardingPath} replace />;
    }
  }

  return children ? children : <Outlet />;
};

export default OnboardingGuard;
