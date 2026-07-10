import { useAuth } from "@clerk/clerk-react";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { setUser, setHydrated, hydrated } = useAuthStore();

  useEffect(() => {
    if (!isLoaded) return;
    let mounted = true;
    (async () => {
      if (!isSignedIn) {
        if (mounted) {
          setUser(null);
          setHydrated(true);
        }
        return;
      }
      try {
        const res = await authService.me();
        if (mounted && res?.user) setUser(res.user);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
