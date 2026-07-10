import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth, useSignIn, useSignUp } from "@clerk/clerk-react";
import ReCAPTCHA from "react-google-recaptcha";
import { authService } from "@/services/auth";
import { verifyCaptchaToken } from "@/services/recaptcha";
import { Button } from "@/components/common/button";
import { Captcha } from "@/components/common/Captcha";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { useAuthStore, type Role } from "@/stores/authStore";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { clerkErrorMessage } from "@/lib/clerkError";

interface Props {
  mode: "login" | "register";
}

export default function AuthPage({ mode }: Props) {
  const [params] = useSearchParams();
  const initialRole = (params.get("role") as Role) || "INFLUENCER";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>(initialRole);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<ReCAPTCHA>(null);
  const { setUser } = useAuthStore();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { toast } = useToast();
  const navigate = useNavigate();

  // reCAPTCHA v2 tokens are single-use and short-lived — reset the widget
  // after every submit attempt (success or failure) so the next attempt
  // always starts from a fresh, unconsumed token.
  const resetCaptcha = () => {
    captchaRef.current?.reset();
    setCaptchaToken(null);
  };

  // A Clerk session can already be active here — a stale tab, browser back
  // button after signing in, or a tab opened while signed in elsewhere.
  // Calling authenticateWithRedirect (or signIn.create/signUp.create) while
  // one exists throws Clerk's "You're already signed in" error, so bounce
  // out to the same role-resolution page OAuth uses instead of rendering
  // the form at all.
  useEffect(() => {
    if (authLoaded && isSignedIn) {
      navigate("/oauth-role", { replace: true });
    }
  }, [authLoaded, isSignedIn, navigate]);

  const continueWithGoogle = async () => {
    if (isSignedIn) {
      navigate("/oauth-role", { replace: true });
      return;
    }
    try {
      if (mode === "register") {
        sessionStorage.setItem("yc.oauth.role", role);
        sessionStorage.setItem("yc.oauth.name", name || "");
        if (!signUpLoaded) return;
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/oauth-role",
        });
      } else {
        if (!signInLoaded) return;
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/oauth-role",
        });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Google sign-in failed", description: clerkErrorMessage(err) });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignedIn) {
      navigate("/oauth-role", { replace: true });
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords mismatch", description: "Password and Confirm Password do not match." });
      return;
    }
    if (!captchaToken) {
      toast({ variant: "destructive", title: "Verification required", description: "Please complete the \"I'm not a robot\" check." });
      return;
    }
    setLoading(true);
    try {
      await verifyCaptchaToken(captchaToken);
      if (mode === "login") {
        if (!signInLoaded) return;
        const result = await signIn.create({ identifier: email, password });
        if (result.status !== "complete") throw new Error("Additional verification required.");
        await setActiveSignIn({ session: result.createdSessionId });

        const res = await authService.me();
        if (!res?.user) throw new Error("Auth failed");
        setUser(res.user);
        const dest = !res.user.isOnboarded
          ? res.user.role === "BRAND" ? "/onboarding/brand" : "/onboarding/influencer"
          : res.user.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";
        navigate(dest);
      } else {
        if (!signUpLoaded) return;
        await signUp.create({
          emailAddress: email,
          password,
          unsafeMetadata: { role, name },
        });
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        toast({ title: "Verification code sent! ✉️", description: "Please check your inbox for a 6-digit code." });
        navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      const backendMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast({
        variant: "destructive",
        title: mode === "login" ? "Login failed" : "Sign up failed",
        description: backendMsg || clerkErrorMessage(err),
      });
    } finally {
      resetCaptcha();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="h-8 w-8 rounded-sm" />
            <span className="text-sm font-semibold tracking-tight">You Collab</span>
            <span className="ml-2 hidden sm:inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground rounded-sm">Pune</span>
          </Link>
          <Link
            to={mode === "login" ? "/register" : "/login"}
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login" ? "Create account" : "Log in"}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[440px] flex-col px-4 pt-16 pb-20">
        <div className="border border-border rounded-md p-8 space-y-6 bg-background">
          {/* Brand block */}
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <Logo className="h-7 w-7 rounded-sm" />
              <span className="text-sm font-semibold tracking-tight text-foreground">You Collab</span>
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight leading-tight">
              {mode === "login" ? "Sign in to your workspace" : "Create your account"}
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {mode === "login" ? "Welcome back. Pick up where you left off." : "Pick your side. Start collaborating."}
            </p>
          </div>

          {/* Role selector */}
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-0 border border-border rounded-sm overflow-hidden">
              {(["INFLUENCER", "BRAND"] as Role[]).map((r, i) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-3 py-2 text-[12px] font-medium uppercase tracking-[0.06em] transition-colors ${
                    role === r
                      ? "bg-foreground text-background"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  } ${i === 0 ? "border-r border-border" : ""}`}
                >
                  {r === "INFLUENCER" ? "Creator" : "Brand"}
                </button>
              ))}
            </div>
          )}

          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            onClick={continueWithGoogle}
            className="w-full h-9 text-[13px] rounded-sm gap-2"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47a5.55 5.55 0 0 1-2.4 3.64v3.02h3.88c2.27-2.09 3.54-5.17 3.54-8.77Z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z" />
              <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.11Z" />
              <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.62l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Form */}
          <form className="space-y-3" onSubmit={submit}>
            {mode === "register" && (
              <div className="space-y-1">
                <Label htmlFor="name" className="text-[12px]">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === "BRAND" ? "e.g. Koregaon Coffee Co." : "e.g. Aarav Sharma"}
                  className="h-9 text-[13px] rounded-sm"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-[12px]">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-9 text-[13px] rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-[12px]">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-[13px] rounded-sm"
              />
              {mode === "login" && (
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>
            {mode === "register" && (
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-[12px]">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 text-[13px] rounded-sm"
                />
              </div>
            )}

            <Captcha ref={captchaRef} onChange={setCaptchaToken} />

            <Button
              type="submit"
              disabled={loading || !captchaToken}
              className="w-full h-9 text-[13px] rounded-sm gap-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </form>

          {/* Footer link */}
          <p className="text-[11px] text-muted-foreground text-left pt-2 border-t border-border">
            {mode === "login" ? (
              <>New here? <Link to="/register" className="text-foreground hover:underline">Create an account</Link></>
            ) : (
              <>Already a member? <Link to="/login" className="text-foreground hover:underline">Sign in</Link></>
            )}
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          © {new Date().getFullYear()} YouCollab
        </p>
      </main>
    </div>
  );
}
