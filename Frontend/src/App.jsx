import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useUiStore } from './stores/uiStore';
import { ToastProvider } from './components/ui/ToastProvider';

// Auth components
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';
import OnboardingGuard from './components/auth/OnboardingGuard';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import BrandOnboarding from './pages/onboarding/BrandOnboarding';
import InfluencerOnboarding from './pages/onboarding/InfluencerOnboarding';
import BrandDashboard from './pages/dashboard/BrandDashboard';
import InfluencerDashboard from './pages/dashboard/InfluencerDashboard';
import GigFeed from './pages/gigs/GigFeed';
import GigDetail from './pages/gigs/GigDetail';
import CreateGig from './pages/gigs/CreateGig';
import MyGigs from './pages/gigs/MyGigs';
import GigApplicants from './pages/gigs/GigApplicants';
import MyApplications from './pages/applications/MyApplications';

function App() {
  const initAuth = useAuthStore((s) => s.initAuth);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    initAuth();
    
    // Safety net: if initAuth hangs for more than 2 seconds, force it to stop loading
    const timer = setTimeout(() => {
      if (useAuthStore.getState().isInitializing) {
        console.warn('Auth initialization timed out. Forcing app to load.');
        useAuthStore.getState().setInitializing(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [initAuth]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary animate-pulse" />
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Onboarding */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding/brand" element={<BrandOnboarding />} />
          <Route path="/onboarding/influencer" element={<InfluencerOnboarding />} />
        </Route>

        {/* Dashboard Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<OnboardingGuard />}>
            <Route element={<DashboardLayout />}>
              {/* Brand routes */}
              <Route element={<RoleRoute allowedRole="brand" />}>
                <Route path="/dashboard/brand" element={<BrandDashboard />} />
                <Route path="/gigs/create" element={<CreateGig />} />
                <Route path="/gigs/mine" element={<MyGigs />} />
                <Route path="/gigs/:id/applicants" element={<GigApplicants />} />
              </Route>

              {/* Influencer routes */}
              <Route element={<RoleRoute allowedRole="influencer" />}>
                <Route path="/dashboard/influencer" element={<InfluencerDashboard />} />
                <Route path="/applications" element={<MyApplications />} />
              </Route>

              {/* Shared */}
              <Route path="/gigs" element={<GigFeed />} />
              <Route path="/gigs/:id" element={<GigDetail />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
