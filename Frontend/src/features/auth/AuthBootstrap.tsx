import { authService } from "@/services/auth";
import { tokenStorage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { setUser, setToken, setHydrated, hydrated } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await authService.refresh();
        if (mounted && res?.user) {
          setUser(res.user);
          if (res.accessToken) setToken(res.accessToken);
        }
      } catch {
        const t = tokenStorage.get();
        if (!t && mounted) {
          // not logged in
        }
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
