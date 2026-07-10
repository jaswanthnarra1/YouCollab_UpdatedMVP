import { ArrowRight, Loader2 } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/common/button";
import { Captcha } from "@/components/common/Captcha";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Textarea } from "@/components/common/textarea";
import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { contactService } from "@/services/contact";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<ReCAPTCHA>(null);
  const { toast } = useToast();

  const submit = useMutation({
    mutationFn: () => {
      if (!captchaToken) throw new Error("MISSING_CAPTCHA");
      return contactService.submit({ name, email, message, captchaToken });
    },
    onSuccess: (data) => {
      toast({ title: "Message sent! 📨", description: data.message });
      setName("");
      setEmail("");
      setMessage("");
    },
    onError: (err) => {
      if ((err as Error).message === "MISSING_CAPTCHA") {
        toast({ variant: "destructive", title: "Verification required", description: "Please complete the \"I'm not a robot\" check." });
        return;
      }
      const backendMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast({ variant: "destructive", title: "Couldn't send message", description: backendMsg || "Something went wrong. Try again." });
    },
    onSettled: () => {
      captchaRef.current?.reset();
      setCaptchaToken(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit.mutate();
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
          <Link to="/" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] flex-col px-4 pt-16 pb-20">
        <div className="border border-border rounded-md p-8 space-y-6 bg-background">
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <Logo className="h-7 w-7 rounded-sm" />
              <span className="text-sm font-semibold tracking-tight text-foreground">You Collab</span>
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight leading-tight">Get in touch</h1>
            <p className="text-[13px] text-muted-foreground">Questions, feedback, or a partnership idea — send us a note.</p>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="name" className="text-[12px]">Name</Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-9 text-[13px] rounded-sm"
              />
            </div>
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
              <Label htmlFor="message" className="text-[12px]">Message</Label>
              <Textarea
                id="message"
                required
                minLength={10}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                className="min-h-[120px] text-[13px] rounded-sm"
              />
            </div>

            <Captcha ref={captchaRef} onChange={setCaptchaToken} />

            <Button
              type="submit"
              disabled={submit.isPending || !captchaToken}
              className="w-full h-9 text-[13px] rounded-sm gap-1.5"
            >
              {submit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                <>Send message <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </form>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          © {new Date().getFullYear()} YouCollab
        </p>
      </main>
    </div>
  );
}
