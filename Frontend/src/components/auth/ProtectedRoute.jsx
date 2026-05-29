import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import Skeleton from '../ui/Skeleton';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const location = useLocation();

  if (isInitializing) {
    // Full Page Skeleton Loading UI
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-dark-bg p-6 space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-neutral-200 dark:border-dark-border">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-3">
            <Skeleton variant="avatar" className="w-8 h-8" />
            <Skeleton variant="avatar" className="w-8 h-8" />
          </div>
        </div>
        <div className="flex-1 flex gap-6 max-w-7xl mx-auto w-full">
          <div className="hidden md:block w-64 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1 space-y-6">
            <Skeleton className="h-12 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Skeleton variant="rect" className="h-32 w-full" />
              <Skeleton variant="rect" className="h-32 w-full" />
              <Skeleton variant="rect" className="h-32 w-full" />
            </div>
            <Skeleton variant="rect" className="h-80 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, storing original target path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
