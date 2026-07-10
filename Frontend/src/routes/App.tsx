import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/clerk-react";
import { Suspense, lazy } from "react";
import { AuthBootstrap } from "@/features/auth/AuthBootstrap";
import { RoleRoute } from "@/features/auth/RoleRoute";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Landing from "@/features/marketplace/Landing";

// Everything past the landing page is behind auth or is a secondary flow —
// lazy-load it so a first-time visitor's initial bundle is just the landing
// page + app shell, not the entire dashboard/gigs/profile surface.
const AuthPage = lazy(() => import("@/features/auth/AuthPage"));
const ForgotPassword = lazy(() => import("@/features/auth/ForgotPassword"));
const InfluencerOnboarding = lazy(() => import("@/features/auth/InfluencerOnboarding"));
const BrandOnboarding = lazy(() => import("@/features/auth/BrandOnboarding"));
const InfluencerDashboard = lazy(() => import("@/features/dashboard/InfluencerDashboard"));
const BrandDashboard = lazy(() => import("@/features/dashboard/BrandDashboard"));
const GigCreate = lazy(() => import("@/features/gigs/GigCreate"));
const GigEdit = lazy(() => import("@/features/gigs/GigEdit"));
const GigApplicants = lazy(() => import("@/features/applications/GigApplicants"));
const BrandProfile = lazy(() => import("@/features/dashboard/BrandProfile"));
const CreatorProfile = lazy(() => import("@/features/dashboard/InfluencerProfile"));
const Marketplace = lazy(() => import("@/features/marketplace/Marketplace"));
const GigDetail = lazy(() => import("@/features/gigs/GigDetail"));
const InstagramCallback = lazy(() => import("@/features/auth/InstagramCallback"));
const Settings = lazy(() => import("@/features/dashboard/Settings"));
const VerifyOtpPage = lazy(() => import("@/features/auth/VerifyOtpPage"));
const SsoCallback = lazy(() => import("@/features/auth/SsoCallback"));
const OAuthRole = lazy(() => import("@/features/auth/OAuthRole"));
const Contact = lazy(() => import("@/features/marketplace/Contact"));
const NotFound = lazy(() => import("@/components/layout/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
  </div>
);

const App = () => (
  <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/login">
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthBootstrap>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/register" element={<AuthPage mode="register" />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-otp" element={<VerifyOtpPage />} />
                <Route path="/sso-callback" element={<SsoCallback />} />
                <Route path="/oauth-role" element={<OAuthRole />} />
                <Route path="/instagram/callback" element={<InstagramCallback />} />
                <Route path="/contact" element={<Contact />} />

                {/* Protected Sidebar Routes */}
                <Route element={<SidebarLayout />}>
                  <Route path="/onboarding/influencer" element={
                    <RoleRoute role="INFLUENCER" allowUnonboarded><InfluencerOnboarding /></RoleRoute>
                  } />
                  <Route path="/onboarding/brand" element={
                    <RoleRoute role="BRAND" allowUnonboarded><BrandOnboarding /></RoleRoute>
                  } />

                  <Route path="/dashboard/influencer" element={
                    <RoleRoute role="INFLUENCER"><InfluencerDashboard /></RoleRoute>
                  } />
                  <Route path="/dashboard/brand" element={
                    <RoleRoute role="BRAND"><BrandDashboard /></RoleRoute>
                  } />

                  <Route path="/gigs/new" element={
                    <RoleRoute role="BRAND"><GigCreate /></RoleRoute>
                  } />
                  <Route path="/gigs/:id/edit" element={
                    <RoleRoute role="BRAND"><GigEdit /></RoleRoute>
                  } />
                  <Route path="/gigs/:id/applicants" element={
                    <RoleRoute role="BRAND"><GigApplicants /></RoleRoute>
                  } />
                  <Route path="/gigs/:id" element={
                    <ProtectedRoute><GigDetail /></ProtectedRoute>
                  } />

                  <Route path="/marketplace" element={
                    <ProtectedRoute><Marketplace /></ProtectedRoute>
                  } />

                  <Route path="/profile/brand" element={
                    <RoleRoute role="BRAND"><BrandProfile /></RoleRoute>
                  } />
                  <Route path="/profile/creator" element={
                    <RoleRoute role="INFLUENCER"><CreatorProfile /></RoleRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute><Settings /></ProtectedRoute>
                  } />
                </Route>

                {/* Legacy redirects */}
                <Route path="/auth" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthBootstrap>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
  </ClerkProvider>
);

export default App;
