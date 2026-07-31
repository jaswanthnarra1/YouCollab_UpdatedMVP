import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { authService } from "@/services/auth";
import { Button } from "@/components/common/button";
import { Logo } from "@/components/ui/logo";
import { useAuthStore, type Role } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { clerkErrorMessage } from "@/lib/clerkError";

const log = (...args: unknown[]) => console.log("[OAuthRole]", ...args);

// Landing spot after any OAuth (Google) sign-in/up. Google accounts skip the
// app's own role toggle, so a first-time OAuth user picks Creator/Brand here
// before their local profile is provisioned; returning users pass straight
// through.
//
// This page must never auto-redirect away on failure: AuthPage redirects
// *back* here whenever Clerk reports an active session (so a signed-in user
// can't hit the login form and get Clerk's "already signed in" error) — if
// this page responded to a failed backend call by bouncing to /login, the
// two pages would ping-pong forever, since Clerk's own session is still
// valid the whole time (only our /api/auth/me call failed, not the Clerk
// session itself). Failures are shown in-page with a retry instead.
export default function OAuthRole() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { setUser } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const proceed = async () => {
    setError(null);
    log("resolving session — calling GET /api/auth/me");
    try {
      const res = await authService.me();
      if (!res?.user) throw new Error("Sign-in failed — no user returned.");
      log("user fetched", { id: res.user.id, role: res.user.role, isOnboarded: res.user.isOnboarded });
      setUser(res.user);
      const dest = res.user.needsTermsAcceptance
        ? "/terms"
        : !res.user.isOnboarded
          ? res.user.role === "BRAND" ? "/onboarding/brand" : "/onboarding/influencer"
          : res.user.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";
      log("navigating to", dest);
      navigate(dest, { replace: true });
    } catch (err) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        ?? clerkErrorMessage(err, "Couldn't complete sign-in.");
      log("failed:", message, err);
      setError(message);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !user) return;
    log("Clerk session ready", { userId: user.id, hasRole: !!user.unsafeMetadata?.role });
    if (user.unsafeMetadata?.role) {
      void proceed();
      return;
    }
    // First-time Google sign-up from the register page pre-selects a role —
    // apply it automatically instead of asking again.
    const stashedRole = sessionStorage.getItem("yc.oauth.role") as Role | null;
    if (stashedRole === "BRAND" || stashedRole === "INFLUENCER") {
      void chooseRole(stashedRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user]);

  const chooseRole = async (role: Role) => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const stashedName = sessionStorage.getItem("yc.oauth.name");
      log("setting role", role);
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          role,
          name: stashedName || user.fullName || user.primaryEmailAddress?.emailAddress,
        },
      });
      sessionStorage.removeItem("yc.oauth.role");
      sessionStorage.removeItem("yc.oauth.name");
      await proceed();
    } catch (err) {
      const message = clerkErrorMessage(err, "Couldn't complete sign-up.");
      log("role update failed:", message, err);
      toast({ variant: "destructive", title: "Couldn't complete sign-up", description: message });
      setSubmitting(false);
    }
  };

  const handleStartOver = async () => {
    log("user chose to sign out and start over");
    await signOut();
    navigate("/login", { replace: true });
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-[440px] px-4">
          <div className="border border-border rounded-md p-8 space-y-5 bg-background text-center">
            <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-[18px] font-semibold tracking-tight">Couldn't finish signing you in</h1>
              <p className="text-[13px] text-muted-foreground mt-1">{error}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => void proceed()} className="h-9 text-[13px] rounded-sm">
                Try again
              </Button>
              <Button variant="outline" onClick={() => void handleStartOver()} className="h-9 text-[13px] rounded-sm">
                Sign out and start over
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded || !user || submitting || user.unsafeMetadata?.role || sessionStorage.getItem("yc.oauth.role")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[440px] flex-col px-4 pt-16 pb-20">
        <div className="border border-border rounded-md p-8 space-y-6 bg-background">
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <Logo className="h-7 w-7 rounded-sm" />
              <span className="text-sm font-semibold tracking-tight text-foreground">You Collab</span>
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight leading-tight">One more thing</h1>
            <p className="text-[13px] text-muted-foreground">Pick your side to finish setting up your account.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-16 rounded-sm flex-col gap-1" onClick={() => chooseRole("INFLUENCER")}>
              Creator <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" className="h-16 rounded-sm flex-col gap-1" onClick={() => chooseRole("BRAND")}>
              Brand <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {submitting && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
        </div>
      </main>
    </div>
  );
}
