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
    console.log("[AuthBootstrap] Clerk loaded", { isSignedIn });
    (async () => {
      if (!isSignedIn) {
        if (mounted) {
          setUser(null);
          setHydrated(true);
          console.log("[AuthBootstrap] not signed in — hydrated with no user");
        }
        return;
      }
      try {
        let res;
        try {
          res = await authService.me();
        } catch (err) {
          // A 401 right here is almost always window.Clerk.session lagging a
          // beat behind the isSignedIn flag that triggered this effect — the
          // token genuinely isn't attachable yet, not an expired session. One
          // short retry clears it instead of bouncing a just-logged-in user
          // straight back to /login.
          if ((err as { response?: { status?: number } })?.response?.status !== 401) throw err;
          console.warn("[AuthBootstrap] /api/auth/me got 401 on first try — retrying once");
          await new Promise((r) => setTimeout(r, 400));
          res = await authService.me();
        }
        if (mounted && res?.user) {
          setUser(res.user);
          console.log("[AuthBootstrap] user fetched — hydrated", { id: res.user.id, role: res.user.role });
        }
      } catch (err) {
        if (mounted) setUser(null);
        console.warn("[AuthBootstrap] /api/auth/me failed — hydrated with no user", err);
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
