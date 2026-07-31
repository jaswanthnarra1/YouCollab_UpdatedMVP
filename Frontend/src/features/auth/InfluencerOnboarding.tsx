import { Button } from "@/components/common/button";
import { CheckCircle2, Instagram, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Input } from "@/components/common/input";
import { instagramService } from "@/services/instagram";
import { Label } from "@/components/common/label";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { NICHES } from "@/constants";
import { onboardingService } from "@/services/onboarding";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { Textarea } from "@/components/common/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function InfluencerOnboarding() {
  const [name, setName] = useState("");
  const [niche, setNiche] = useState<string>("Fashion");
  const [pincode, setPincode] = useState("");
  const [bio, setBio] = useState("");
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState<number | "">("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { patchUser } = useAuthStore();

  const save = useMutation({
    mutationFn: () => onboardingService.influencer({
      name, niche, bio, pincode,
      followerCount: Number(followers || 0),
      instagramHandle: handle || undefined,
      profileImageUrl: profileImageUrl || undefined,
    }),
    onSuccess: () => {
      patchUser({ isOnboarded: true, name });
      toast({ title: "You're in!", description: "Welcome to YouCollab." });
      navigate("/dashboard/influencer");
    },
    onError: (err: any) => {
      toast({ 
        variant: "destructive", 
        title: "Couldn't save", 
        description: err?.response?.data?.error?.message ?? err?.response?.data?.message ?? "Try again." 
      });
    },
  });

  const connectIG = useMutation({
    mutationFn: instagramService.connect,
    onSuccess: (d) => { if (d?.url) window.location.href = d.url; },
    onError: (e: any) => toast({
      variant: "destructive",
      title: "Instagram connect failed",
      description: e?.response?.data?.error?.message ?? "Try again.",
    }),
  });

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const valid = name && countWords(bio) >= 3 && niche && /^\d{6}$/.test(pincode);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm mb-3">Creator setup</span>
          <h1 className="text-3xl font-semibold tracking-tight">Set up your creator profile</h1>
          <p className="text-[13px] text-muted-foreground mt-1">A few details so Pune brands can find you.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="border border-border rounded-sm p-6 bg-background space-y-5">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" className="h-9 text-[13px] rounded-sm" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Niche</Label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{NICHES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Instagram handle (optional)</Label>
              <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle" className="h-9 text-[13px] rounded-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">PIN code</Label>
            <Input
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="411001"
              maxLength={6}
              className="h-9 text-[13px] rounded-sm max-w-[160px]"
            />
            <p className="text-xs text-muted-foreground">See gigs near you. We currently support Pune PIN codes.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Bio <span className="text-muted-foreground">(min 3 words)</span></Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What makes your content unforgettable?" className="text-[13px] rounded-sm min-h-[110px]" />
            <p className="text-xs text-muted-foreground">{countWords(bio)}/3 words</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Follower count (fallback)</Label>
              <Input type="number" min={0} value={followers} onChange={(e) => setFollowers(e.target.value === "" ? "" : Number(e.target.value))} placeholder="12500" className="h-9 text-[13px] rounded-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Profile image URL (optional)</Label>
              <Input value={profileImageUrl} onChange={(e) => setProfileImageUrl(e.target.value)} placeholder="https://..." className="h-9 text-[13px] rounded-sm" />
            </div>
          </div>

          <div className="border border-border rounded-sm p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-sm border border-border flex items-center justify-center shrink-0">
              <Instagram className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-[13px] font-semibold">Connect Instagram via Meta</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">Verified followers, engagement & average likes — instantly. Pune brands trust verified creators 3× more.</p>
              <ConfirmDialog
                title="Connect your Instagram Professional Account"
                description="Connect your Business or Creator account to verify your creator profile."
                confirmLabel="Continue with Instagram"
                onConfirm={() => connectIG.mutate()}
                className="max-w-lg"
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={connectIG.isPending}
                    className="mt-3 h-8 text-[12px] rounded-sm gap-1.5"
                  >
                    {connectIG.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect Instagram"}
                  </Button>
                }
              >
                <div className="space-y-3 py-1">
                  <ul className="space-y-1.5 text-[12.5px]">
                    {["Verified Creator Badge", "Follower Insights", "Better Brand Matching", "Faster Collaboration Approval"].map((b) => (
                      <li key={b} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>
                  <div className="border border-border rounded-sm p-3 bg-muted/40">
                    <p className="text-[11px] font-semibold text-foreground">Important</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Only Instagram Professional accounts (Business or Creator) are supported. Personal accounts
                      cannot be connected because Meta no longer supports Personal Account API authentication.
                    </p>
                  </div>
                </div>
              </ConfirmDialog>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button disabled={!valid || save.isPending} onClick={() => save.mutate()} className="h-9 text-[13px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish setup"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
