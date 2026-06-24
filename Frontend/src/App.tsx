import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { RoleRoute } from "@/components/RoleRoute";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import InfluencerOnboarding from "./pages/onboarding/InfluencerOnboarding";
import BrandOnboarding from "./pages/onboarding/BrandOnboarding";
import InfluencerDashboard from "./pages/influencer/Dashboard";
import BrandDashboard from "./pages/brand/Dashboard";
import GigCreate from "./pages/brand/GigCreate";
import GigApplicants from "./pages/brand/GigApplicants";
import InstagramCallback from "./pages/InstagramCallback";
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
              <Route path="/instagram/callback" element={<InstagramCallback />} />

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
              <Route path="/gigs/:id/applicants" element={
                <RoleRoute role="BRAND"><GigApplicants /></RoleRoute>
              } />

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
