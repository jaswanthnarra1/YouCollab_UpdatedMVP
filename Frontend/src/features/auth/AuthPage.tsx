import { ArrowRight, Loader2 } from "lucide-react";
import { authService } from "@/services/auth";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { useAuthStore, type Role } from "@/stores/authStore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
  const { setUser, setToken } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await authService.login(email, password);
        if (!res?.user) throw new Error("Auth failed");
        setUser(res.user);
        if (res.accessToken) setToken(res.accessToken);
        const dest = !res.user.isOnboarded
          ? res.user.role === "BRAND" ? "/onboarding/brand" : "/onboarding/influencer"
          : res.user.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";
        navigate(dest);
      } else {
        if (password !== confirmPassword) {
          toast({ variant: "destructive", title: "Passwords mismatch", description: "Password and Confirm Password do not match." });
          setLoading(false);
          return;
        }
        const res = await authService.register(name, email, password, role);
        const devOtp = res?.dev_otp ?? "";
        toast({
          title: "OTP Code Sent! ✉️",
          description: devOtp
            ? `Dev mode: your code is ${devOtp}`
            : "Please check your inbox for a 6-digit verification code.",
        });
        navigate(`/verify-otp?email=${encodeURIComponent(email)}${devOtp ? `&dev_otp=${devOtp}` : ""}`);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        "Something went wrong";
      toast({ variant: "destructive", title: mode === "login" ? "Login failed" : "Sign up failed", description: msg });
    } finally {
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
            <Button
              type="submit"
              disabled={loading}
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
