import { Button } from "@/components/common/button";
import { CATEGORIES } from "@/constants";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { onboardingService } from "@/services/onboarding";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { Textarea } from "@/components/common/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function BrandOnboarding() {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<string>("Cafe");
  const [location, setLocation] = useState("Pune");
  const [pincode, setPincode] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { patchUser } = useAuthStore();

  const save = useMutation({
    mutationFn: () => onboardingService.brand({
      businessName, category, location, bio, pincode,
      website: website || undefined,
      logoUrl: logoUrl || undefined,
    }),
    onSuccess: () => {
      patchUser({ isOnboarded: true, name: businessName });
      toast({ title: "Welcome to YouCollab!" });
      navigate("/dashboard/brand");
    },
    onError: (err: any) =>
      toast({ 
        variant: "destructive", 
        title: "Save failed", 
        description: err?.response?.data?.error?.message ?? err?.response?.data?.message ?? "Try again." 
      }),
  });

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const valid = businessName && category && location && /^\d{6}$/.test(pincode) && countWords(bio) >= 3;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm mb-3">Brand setup</span>
          <h1 className="text-3xl font-semibold tracking-tight">Tell us about your brand</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Creators will see this on every gig you post.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="border border-border rounded-sm p-6 bg-background space-y-5">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Business name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Koregaon Coffee Co." className="h-9 text-[13px] rounded-sm" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-9 text-[13px] rounded-sm" />
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
            <p className="text-xs text-muted-foreground">Powers radius matching for your collabs. We currently support Pune PIN codes.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Bio <span className="text-muted-foreground">(min 3 words)</span></Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What does your brand stand for?" className="text-[13px] rounded-sm min-h-[110px]" />
            <p className="text-xs text-muted-foreground">{countWords(bio)}/3 words</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Website (optional)</Label>
              <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="h-9 text-[13px] rounded-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Logo URL (optional)</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="h-9 text-[13px] rounded-sm" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button disabled={!valid || save.isPending} onClick={() => save.mutate()} className="h-9 text-[13px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Launch brand"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
