import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Sparkles, ArrowLeft, Pencil } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/services/profile";
import { useAuthStore } from "@/stores/authStore";
import { CATEGORIES } from "@/lib/constants";
import { apiClient } from "@/lib/api";

export default function BrandProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { patchUser } = useAuthStore();

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Cafe");
  const [location, setLocation] = useState("Pune");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: profileService.getProfile,
  });

  useEffect(() => {
    if (profile && profile.brand) {
      setBusinessName(profile.brand.businessName || "");
      setCategory(profile.brand.category || "Cafe");
      setLocation(profile.brand.location || "Pune");
      setBio(profile.brand.bio || "");
      setWebsite(profile.brand.website || "");
      setLogoUrl(profile.brand.logoUrl || "");
    }
  }, [profile]);

  const update = useMutation({
    mutationFn: () => profileService.updateProfile({
      businessName, category, location, bio,
      website: website || undefined,
      logoUrl: logoUrl || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      patchUser({ name: businessName, avatarUrl: logoUrl || null });
      toast({ title: "Profile updated successfully! ✨" });
    },
    onError: (e: any) =>
      toast({ 
        variant: "destructive", 
        title: "Update failed", 
        description: e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Try again." 
      }),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = data.data?.url || data.url;
      if (url) {
        setLogoUrl(url);
        toast({ title: "Logo updated successfully! 📸" });
      }
    } catch {
      toast({ variant: "destructive", title: "Upload failed", description: "Could not upload image." });
    } finally {
      setUploading(false);
    }
  };

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const valid = businessName && category && location && countWords(bio) >= 3;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 neon-grid pointer-events-none" />
      <main className="relative mx-auto max-w-2xl px-4 pt-8 pb-20">
        <div className="mb-4">
          <Button onClick={() => navigate("/dashboard/brand")} variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="chip mb-3"><Sparkles className="h-3 w-3 text-primary" /> Profile settings</div>
          <h1 className="text-3xl font-semibold font-sans">Brand profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage details about your business shown to creators.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-strong rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-4">
            {/* Logo Container with Pen Upload Overlay */}
            <div className="relative group h-16 w-16 rounded-2xl bg-gradient-brand shrink-0 flex items-center justify-center text-primary-foreground font-bold text-xl overflow-hidden border border-border">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                businessName?.[0] || "B"
              )}

              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity duration-200">
                <Pencil className="h-4 w-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{businessName || "Your business"}</h3>
              <p className="text-xs text-muted-foreground">Category: {category} · Location: {location}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Business name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Koregaon Coffee Co." className="glass" />
          </div>

          <div className="space-y-1.5">
            <Label>Registered Email <span className="text-muted-foreground">(read-only)</span></Label>
            <Input value={profile?.email || ""} disabled className="glass opacity-60 cursor-not-allowed" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="glass" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Bio <span className="text-muted-foreground">(min 3 words)</span></Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What does your brand stand for?" className="glass min-h-[110px]" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{countWords(bio)}/3 words</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Website (optional)</Label>
            <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="glass" />
          </div>

          <div className="flex justify-end pt-2">
            <Button disabled={!valid || update.isPending || uploading} onClick={() => update.mutate()} className="bg-gradient-brand text-primary-foreground border-0">
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
