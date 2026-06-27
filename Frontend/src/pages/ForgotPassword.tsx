import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as Error).message
        || "Please try again.";
      toast({ variant: "destructive", title: "Request failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar — matches auth page */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="h-8 w-8 rounded-sm" />
            <span className="text-sm font-semibold tracking-tight">You Collab</span>
            <span className="ml-2 hidden sm:inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground rounded-sm">Pune</span>
          </Link>
          <Link
            to="/login"
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to login
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
              Reset your password
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Enter your email and we'll send a reset link.
            </p>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-12 w-12 rounded-sm border border-border flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-foreground" />
              </div>
              <p className="text-[13px] text-center text-muted-foreground">
                If an account with <span className="text-foreground font-medium">{email}</span> exists, a reset link has been sent. Check your inbox.
              </p>
              <Button asChild variant="outline" className="h-9 text-[13px] rounded-sm mt-2">
                <Link to="/login">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to login
                </Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={submit}>
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
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-9 text-[13px] rounded-sm gap-1.5"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                  <>Send reset link <ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </Button>
            </form>
          )}

          {/* Footer link */}
          <p className="text-[11px] text-muted-foreground text-left pt-2 border-t border-border">
            Remember your password? <Link to="/login" className="text-foreground hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          © {new Date().getFullYear()} YouCollab
        </p>
      </main>
    </div>
  );
}
