import { apiClient } from "@/lib/api";
import { AvatarCropDialog } from "@/components/common/avatar-crop-dialog";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { instagramService } from "@/services/instagram";
import { Label } from "@/components/common/label";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Instagram, Pencil } from "lucide-react";
import { NICHES } from "@/constants";
import { profileService } from "@/services/profile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { Textarea } from "@/components/common/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useEditableForm } from "@/hooks/useEditableForm";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const EMPTY = { name: "", niche: "Lifestyle", pincode: "", bio: "", profileImageUrl: "" };

export default function CreatorProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { patchUser } = useAuthStore();

  const { values, setField, editing, isDirty, startEdit, discard, commit, hydrate } = useEditableForm(EMPTY);
  const { name, niche, pincode, bio, profileImageUrl } = values;

  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: profileService.getProfile,
  });

  // Instagram handle and follower count are read-only, sourced from the Meta
  // Graph API after a verified OAuth connection — never user input. The
  // backend rejects client-supplied values for both.
  const { data: instagram } = useQuery({
    queryKey: ["instagramProfile"],
    queryFn: instagramService.profile,
    retry: false,
  });
  const igConnected = !!instagram?.isConnected;

  useEffect(() => {
    // Don't let a background refetch overwrite in-progress edits.
    if (!profile?.influencer || editing) return;
    hydrate({
      name: profile.influencer.name || "",
      niche: profile.influencer.niche || "Lifestyle",
      pincode: profile.influencer.pincode || "",
      bio: profile.influencer.bio || "",
      profileImageUrl: profile.influencer.profileImageUrl || "",
    });
  }, [profile, editing, hydrate]);

  const update = useMutation({
    mutationFn: () => profileService.updateProfile({
      name, niche, bio, pincode,
      profileImageUrl: profileImageUrl || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      patchUser({ name, avatarUrl: profileImageUrl || null });
      commit();
      toast({ title: "Profile updated successfully." });
    },
    onError: (e: any) =>
      toast({
        variant: "destructive",
        title: "Update failed",
        description: e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Try again.",
      }),
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingImage(file);
    // Reset so re-picking the same file still fires onChange.
    e.target.value = "";
  };

  const handleCropped = async (blob: Blob) => {
    setPendingImage(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");
      const { data } = await apiClient.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = data.data?.url || data.url;
      if (url) {
        // Staged like any other field — persisted only when the form is saved.
        setField("profileImageUrl", url);
        toast({ title: "Profile image uploaded! 📸" });
      }
    } catch {
      toast({ variant: "destructive", title: "Upload failed", description: "Could not upload image." });
    } finally {
      setUploading(false);
    }
  };

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  // Instagram handle / follower count are no longer part of this form (Meta owns
  // them), so they can't gate saving — a creator who hasn't connected Instagram
  // yet must still be able to edit their name, niche, PIN code and bio.
  const valid = name && niche && /^\d{6}$/.test(pincode) && countWords(bio) >= 3;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">

        {/* Back Link */}
        <div>
          <Button onClick={() => navigate("/dashboard/influencer")} variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground h-8 text-[12px] rounded-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </div>

        {/* Header Section matching Dashboard layout */}
        <div>
          <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm mb-3">Profile settings</span>
          <h1 className="text-3xl font-semibold tracking-tight">Creator profile</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage details about your media presence shown to brands.</p>
        </div>

        {/* Content Panel Box matching Dashboard card style */}
        <div className="border border-border rounded-sm p-6 bg-background space-y-5">
          <div className="flex items-center gap-4">
            {/* Avatar — editable only in edit mode, since it's saved with the form. */}
            <div className="relative group h-16 w-16 rounded-sm bg-gradient-brand shrink-0 flex items-center justify-center text-primary-foreground font-bold text-xl overflow-hidden border border-border">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : profileImageUrl ? (
                <img src={profileImageUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                name?.[0] || "U"
              )}

              {editing && (
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity duration-200">
                  <Pencil className="h-4 w-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{name || "Your name"}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Instagram className="h-3 w-3 text-pink-500" />
                {igConnected ? `@${instagram?.username}` : "Instagram not connected"} · Niche: {niche}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Full name</Label>
            <Input
              value={name}
              onChange={(e) => setField("name", e.target.value)}
              disabled={!editing}
              placeholder="Riya Sen"
              className="h-9 text-[13px] rounded-sm disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Registered Email <span className="text-muted-foreground">(read-only)</span></Label>
            <Input value={profile?.email || ""} disabled className="h-9 text-[13px] rounded-sm opacity-60 cursor-not-allowed bg-muted/40" />
          </div>

          {/* Meta-owned, never editable — not even in edit mode. Values come from
              the Graph API after a verified Instagram connection; the backend
              ignores any client-sent value for either field. */}
          {igConnected ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px]">
                  Instagram handle <span className="text-muted-foreground">(from Instagram)</span>
                </Label>
                <div className="h-9 flex items-center gap-2 px-3 rounded-sm border border-border bg-muted/40">
                  {instagram?.profilePicUrl ? (
                    <img src={instagram.profilePicUrl} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <Instagram className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-[13px] truncate">@{instagram?.username}</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-success shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Connected
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">
                  Follower count <span className="text-muted-foreground">(from Instagram)</span>
                </Label>
                <div className="h-9 flex items-center px-3 rounded-sm border border-border bg-muted/40">
                  <span className="text-[13px]">{(instagram?.followersCount ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-sm p-4 bg-muted/30 space-y-3">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[12px]">Instagram handle</Label>
                  <p className="text-[12px] text-muted-foreground">Please connect your Instagram account.</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[12px]">Follower count</Label>
                  <p className="text-[12px] text-muted-foreground">Available after connecting Instagram.</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-8 text-[12px] rounded-sm">
                <Link to="/dashboard/influencer">
                  <Instagram className="h-3.5 w-3.5 mr-1" /> Connect Instagram
                </Link>
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[12px]">Primary Niche</Label>
            <Select value={niche} onValueChange={(v) => setField("niche", v)} disabled={!editing}>
              <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border disabled:opacity-70 disabled:cursor-not-allowed"><SelectValue /></SelectTrigger>
              <SelectContent>{NICHES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">PIN code</Label>
            <Input
              value={pincode}
              onChange={(e) => setField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={!editing}
              placeholder="411001"
              maxLength={6}
              className="h-9 text-[13px] rounded-sm max-w-[160px] disabled:opacity-70 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">See collabs near you.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Bio <span className="text-muted-foreground">(min 3 words)</span></Label>
            <Textarea
              value={bio}
              onChange={(e) => setField("bio", e.target.value)}
              disabled={!editing}
              placeholder="Tell brands about your audience engagement and content style..."
              className="text-[13px] rounded-sm min-h-[110px] disabled:opacity-70 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{countWords(bio)}/3 words</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  onClick={discard}
                  disabled={update.isPending || uploading}
                  className="h-9 text-[13px] rounded-sm"
                >
                  Discard
                </Button>
                <Button
                  // Disabled until something actually differs from the loaded
                  // values, and re-disabled if the user reverts their edit.
                  disabled={!isDirty || !valid || update.isPending || uploading}
                  onClick={() => update.mutate()}
                  className="h-9 text-[13px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95"
                >
                  {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                </Button>
              </>
            ) : (
              <Button onClick={startEdit} className="h-9 text-[13px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95">
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
              </Button>
            )}
          </div>
        </div>

      </main>

      <AvatarCropDialog
        file={pendingImage}
        onCancel={() => setPendingImage(null)}
        onCropped={handleCropped}
      />
    </div>
  );
}
