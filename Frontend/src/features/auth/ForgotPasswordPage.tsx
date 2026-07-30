import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { useSignIn } from "@clerk/clerk-react";
import { authService } from "@/services/auth";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { clerkErrorMessage } from "@/lib/clerkError";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { toast } = useToast();
  const navigate = useNavigate();

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email });
      const factor = result.supportedFirstFactors?.find(
        (f) => f.strategy === "reset_password_email_code"
      );
      if (!factor || !("emailAddressId" in factor)) {
        throw new Error("No account found for this email.");
      }
      await signIn.prepareFirstFactor({
        strategy: "reset_password_email_code",
        emailAddressId: factor.emailAddressId,
      });
      toast({ title: "Code sent! ✉️", description: "Please check your email for a 6-digit code." });
      setStep("reset");
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't send code", description: clerkErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });
      if (result.status !== "complete") throw new Error("Reset incomplete. Try again.");
      await setActive({ session: result.createdSessionId });

      const res = await authService.me();
      if (!res?.user) throw new Error("Sign-in failed");
      setUser(res.user);

      toast({ title: "Password reset! 🔑", description: "You're signed in with your new password." });
      const dest = !res.user.isOnboarded
        ? res.user.role === "BRAND" ? "/onboarding/brand" : "/onboarding/influencer"
        : res.user.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";
      navigate(dest);
    } catch (err) {
      toast({ variant: "destructive", title: "Reset failed", description: clerkErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="h-8 w-8 rounded-sm" />
            <span className="text-sm font-semibold tracking-tight">You Collab</span>
            <span className="ml-2 hidden sm:inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground rounded-sm">Pune</span>
          </Link>
          <Link to="/login" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            Log in
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[440px] flex-col px-4 pt-16 pb-20">
        <div className="border border-border rounded-md p-8 space-y-6 bg-background">
          <div className="flex flex-col items-start gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 mb-1">
              <KeyRound className="h-5 w-5" />
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight leading-tight">
              {step === "email" ? "Reset your password" : "Choose a new password"}
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {step === "email"
                ? "Enter your email and we'll send you a verification code."
                : <>Enter the code sent to <span className="font-semibold text-foreground">{email}</span> and your new password.</>}
            </p>
          </div>

          {step === "email" ? (
            <form className="space-y-3" onSubmit={requestCode}>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-[12px]">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-9 text-[13px] rounded-sm"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-9 text-[13px] rounded-sm gap-1.5">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                  <>Send code <ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </Button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={resetPassword}>
              <div className="space-y-1">
                <Label htmlFor="code" className="text-[12px]">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="h-9 text-[13px] rounded-sm tracking-widest"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-[12px]">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 text-[13px] rounded-sm"
                />
              </div>
              <Button type="submit" disabled={loading || code.length !== 6} className="w-full h-9 text-[13px] rounded-sm gap-1.5">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                  <>Reset password <ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </Button>
            </form>
          )}

          <p className="text-[11px] text-muted-foreground text-left pt-2 border-t border-border">
            Remembered it? <Link to="/login" className="text-foreground hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
