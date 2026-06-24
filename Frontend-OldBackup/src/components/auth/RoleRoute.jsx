import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';

export const RoleRoute = ({ children, allowedRole }) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role.toLowerCase() !== allowedRole.toLowerCase()) {
    // If wrong role, bounce back to safe dashboard
    const safeDashboard = user.role === 'BRAND' ? '/dashboard/brand' : '/dashboard/influencer';
    return <Navigate to={safeDashboard} replace />;
  }

  return children ? children : <Outlet />;
};

export default RoleRoute;
