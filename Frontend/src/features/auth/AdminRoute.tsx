import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuthStore();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) {
    const dest = user.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
}
