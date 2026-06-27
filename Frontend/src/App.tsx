import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { RoleRoute } from "@/components/RoleRoute";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import SidebarLayout from "./components/SidebarLayout";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import ForgotPassword from "./pages/ForgotPassword";
import InfluencerOnboarding from "./pages/onboarding/InfluencerOnboarding";
import BrandOnboarding from "./pages/onboarding/BrandOnboarding";
import InfluencerDashboard from "./pages/influencer/Dashboard";
import BrandDashboard from "./pages/brand/Dashboard";
import GigCreate from "./pages/brand/GigCreate";
import GigEdit from "./pages/brand/GigEdit";
import GigApplicants from "./pages/brand/GigApplicants";
import BrandProfile from "./pages/brand/Profile";
import CreatorProfile from "./pages/influencer/Profile";
import Marketplace from "./pages/Marketplace";
import GigDetail from "./pages/GigDetail";
import InstagramCallback from "./pages/InstagramCallback";
import Settings from "./pages/Settings";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthBootstrap>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />
              <Route path="/instagram/callback" element={<InstagramCallback />} />

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
          </AuthBootstrap>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
