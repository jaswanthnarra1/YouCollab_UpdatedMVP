import { ArrowRight, Loader2 } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { authService } from "@/services/auth";
import { Button } from "@/components/common/button";
import { Logo } from "@/components/ui/logo";
import { useAuthStore, type Role } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { clerkErrorMessage } from "@/lib/clerkError";

// Landing spot after any OAuth (Google) sign-in/up. Google accounts skip the
// app's own role toggle, so a first-time OAuth user picks Creator/Brand here
// before their local profile is provisioned; returning users pass straight
// through.
export default function OAuthRole() {
  const { user, isLoaded } = useUser();
  const { setUser } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const proceed = async () => {
    try {
      const res = await authService.me();
      if (!res?.user) throw new Error("Sign-in failed");
      setUser(res.user);
      const dest = !res.user.isOnboarded
        ? res.user.role === "BRAND" ? "/onboarding/brand" : "/onboarding/influencer"
        : res.user.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";
      navigate(dest, { replace: true });
    } catch (err) {
      toast({ variant: "destructive", title: "Sign-in failed", description: clerkErrorMessage(err) });
      navigate("/login", { replace: true });
    }
  };

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (user.unsafeMetadata?.role) {
      proceed();
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
    try {
      const stashedName = sessionStorage.getItem("yc.oauth.name");
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
      toast({ variant: "destructive", title: "Couldn't complete sign-up", description: clerkErrorMessage(err) });
      setSubmitting(false);
    }
  };

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
