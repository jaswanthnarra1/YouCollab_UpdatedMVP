import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/common/accordion";
import { Button } from "@/components/common/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/common/dialog";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Link, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { useTheme } from "next-themes";
import { 
  Shield, 
  Bell, 
  Eye, 
  Sliders, 
  HelpCircle, 
  Key, 
  Mail, 
  Trash2, 
  BadgeCheck, 
  Loader2,
  Trash
} from "lucide-react";
import { Switch } from "@/components/common/switch";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/auth";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { clerkErrorMessage } from "@/lib/clerkError";
import { TRIAL_CREDITS, GIG_POST_COST, TIER_COST } from "@/lib/credits";

function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message ?? fallback;
}

type TabType = 
  | "account" 
  | "notifications" 
  | "privacy" 
  | "preferences" 
  | "support";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout, patchUser } = useAuthStore();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("account");

  // 1. Account & Security Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [pendingEmailId, setPendingEmailId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // 2. Notification Preference States — seeded from the real backend value
  // (users.notificationPrefs), falling back to sensible defaults for
  // accounts that predate this column.
  const defaultNotifs = {
    email: true,
    appUpdates: true,
    collabs: true,
    messages: true,
    marketing: false,
    digest: true,
  };
  const [notifs, setNotifs] = useState({ ...defaultNotifs, ...user?.notificationPrefs });

  // 3. Privacy Preference States — same pattern (users.privacyPrefs).
  const defaultPrivacy = {
    publicProfile: true,
    showFollowers: true,
    showContact: false,
    discoverable: true,
    searchVisible: true,
  };
  const [privacy, setPrivacy] = useState({ ...defaultPrivacy, ...user?.privacyPrefs });

  // 5. Preferences States (local-only — no backend feature reads these yet
  // besides Theme, which is wired to the real next-themes system below)
  const [prefs, setPrefs] = useState({
    language: "en",
    timeZone: "IST",
    location: "Pune",
    category: "Cafe",
    dateFormat: "DD/MM/YYYY",
  });

  useEffect(() => {
    const savedPrefs = localStorage.getItem("yc.settings.prefs");
    if (savedPrefs) setPrefs(JSON.parse(savedPrefs));
  }, []);

  // Sync preference helpers — persist to the backend, not just localStorage,
  // so these actually survive across devices and logout/login.
  const updateNotif = (key: keyof typeof notifs, value: boolean) => {
    const prev = notifs;
    const updated = { ...notifs, [key]: value };
    setNotifs(updated);
    patchUser({ notificationPrefs: updated });
    authService.updatePreferences({ notificationPrefs: { [key]: value } })
      .then(() => toast({ title: "Notification preference updated" }))
      .catch(() => {
        // Roll back the optimistic flip so the switch reflects what actually persisted.
        setNotifs(prev);
        patchUser({ notificationPrefs: prev });
        toast({ variant: "destructive", title: "Couldn't save that preference", description: "Try again." });
      });
  };

  const updatePrivacy = (key: keyof typeof privacy, value: boolean) => {
    const prev = privacy;
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    patchUser({ privacyPrefs: updated });
    authService.updatePreferences({ privacyPrefs: { [key]: value } })
      .then(() => toast({ title: "Privacy preference updated" }))
      .catch(() => {
        setPrivacy(prev);
        patchUser({ privacyPrefs: prev });
        toast({ variant: "destructive", title: "Couldn't save that preference", description: "Try again." });
      });
  };

  const updatePref = (key: keyof typeof prefs, value: string) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    localStorage.setItem("yc.settings.prefs", JSON.stringify(updated));
    toast({ title: "General preferences updated" });
  };

  // Account management actions — password/email are managed by Clerk
  // directly from the client; account deletion goes through the backend so
  // it can also delete the Clerk user (admin-only operation).
  const changePasswordMutation = useMutation({
    mutationFn: () => clerkUser!.updatePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated successfully! 🔐" });
    },
    onError: (err) => toast({ variant: "destructive", title: "Couldn't update password", description: clerkErrorMessage(err, "Try again.") }),
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ variant: "destructive", title: "Fill all password fields" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords mismatch", description: "New password and confirm password do not match." });
      return;
    }
    changePasswordMutation.mutate();
  };

  // Email change is two-step in Clerk: add the address, then verify it with
  // a code before it can become primary.
  const startEmailChangeMutation = useMutation({
    mutationFn: async () => {
      const emailAddress = await clerkUser!.createEmailAddress({ email: newEmail });
      await emailAddress.prepareVerification({ strategy: "email_code" });
      return emailAddress.id;
    },
    onSuccess: (id) => {
      setPendingEmailId(id);
      toast({ title: "Verification code sent! ✉️", description: `Enter the code sent to ${newEmail}.` });
    },
    onError: (err) => toast({ variant: "destructive", title: "Couldn't start email change", description: clerkErrorMessage(err, "Try again.") }),
  });

  const confirmEmailChangeMutation = useMutation({
    mutationFn: async () => {
      const emailAddress = clerkUser!.emailAddresses.find((e) => e.id === pendingEmailId);
      if (!emailAddress) throw new Error("Verification session expired. Start again.");
      await emailAddress.attemptVerification({ code: emailOtp });
      await clerkUser!.update({ primaryEmailAddressId: emailAddress.id });
      return emailAddress.emailAddress;
    },
    onSuccess: (email) => {
      patchUser({ email });
      setNewEmail("");
      setEmailOtp("");
      setPendingEmailId(null);
      toast({ title: "Email updated successfully!", description: `Your account email is now ${email}.` });
    },
    onError: (err) => toast({ variant: "destructive", title: "Couldn't verify email", description: clerkErrorMessage(err, "Try again.") }),
  });

  const handleChangeEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingEmailId) {
      if (emailOtp.length !== 6) {
        toast({ variant: "destructive", title: "Invalid code", description: "The verification code must be exactly 6 digits." });
        return;
      }
      confirmEmailChangeMutation.mutate();
      return;
    }
    if (!newEmail) {
      toast({ variant: "destructive", title: "Email is required" });
      return;
    }
    startEmailChangeMutation.mutate();
  };

  const deleteAccountMutation = useMutation({
    mutationFn: () => authService.deleteAccount(),
    onSuccess: async () => {
      setIsDeleteModalOpen(false);
      await signOut();
      logout();
      toast({ title: "Account deleted permanently." });
      navigate("/");
    },
    onError: (err) => toast({ variant: "destructive", title: "Couldn't delete account", description: apiErrorMessage(err, "Try again.") }),
  });

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "DELETE") {
      toast({ variant: "destructive", title: "Confirmation mismatch", description: 'Please type "DELETE" to confirm.' });
      return;
    }
    deleteAccountMutation.mutate();
  };

  // Nav categories layout
  const categories = [
    { id: "account", label: "Account & Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy Settings", icon: Eye },
    { id: "preferences", label: "Preferences", icon: Sliders },
    { id: "support", label: "Help & Support", icon: HelpCircle },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-[1200px] px-6 py-10 space-y-10">
        {/* Header matching dashboard */}
        <div>
          <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm mb-3">Workspace configuration</span>
          <h1 className="text-3xl font-semibold tracking-tight">Account Settings</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage security credentials, integrations, preferences, and support access.</p>
        </div>

        {/* Tab Navigation matching dashboard */}
        <div className="flex border-b border-border overflow-x-auto whitespace-nowrap scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`pb-3 text-sm font-semibold tracking-tight px-4 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === cat.id 
                    ? "border-foreground text-foreground" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Setting Panel Contents matching gig/pitch card list of dashboard */}
        <div className="space-y-6">
          
          {/* 1. Account & Security Tab */}
          {activeTab === "account" && (
            <div className="grid md:grid-cols-2 gap-4">
              
              {/* Email settings card */}
              <div className="border border-border rounded-sm p-5 bg-background flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> Email settings</span>
                    <span className="inline-flex items-center gap-1 border border-emerald-500/25 px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded-sm text-emerald-400 bg-emerald-500/5">
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </span>
                  </div>

                  <h3 className="mt-3 text-[14px] font-semibold">Email Address</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">Your primary communication address: <span className="font-semibold text-foreground">{user?.email}</span></p>

                  <form onSubmit={handleChangeEmail} className="mt-4 space-y-3">
                    {!pendingEmailId ? (
                      <div className="space-y-1.5">
                        <Label className="text-[12px]">New email address</Label>
                        <Input
                          type="email"
                          required
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="new-email@example.com"
                          className="h-9 text-[13px] rounded-sm"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-[12px]">Verification code sent to {newEmail}</Label>
                        <Input
                          type="text"
                          required
                          maxLength={6}
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="6-digit code"
                          className="h-9 text-[13px] rounded-sm font-bold tracking-[0.2em] text-center"
                        />
                        <button
                          type="button"
                          onClick={() => { setPendingEmailId(null); setEmailOtp(""); }}
                          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Use a different email
                        </button>
                      </div>
                    )}
                    <Button
                      type="submit"
                      disabled={startEmailChangeMutation.isPending || confirmEmailChangeMutation.isPending}
                      className="w-full h-8 text-[12px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95"
                    >
                      {(startEmailChangeMutation.isPending || confirmEmailChangeMutation.isPending) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : pendingEmailId ? "Verify & Update Email" : "Change Email"}
                    </Button>
                  </form>
                </div>
              </div>

              {/* Update Password card */}
              <div className="border border-border rounded-sm p-5 bg-background flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Key className="h-3 w-3" /> Password credentials</span>
                  </div>
                  
                  <h3 className="mt-3 text-[14px] font-semibold">Update Password</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">Change password security credentials periodically.</p>

                  <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[12px]">Current Password</Label>
                      <Input 
                        type="password" 
                        required
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="h-9 text-[13px] rounded-sm" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[12px]">New Password</Label>
                      <Input 
                        type="password" 
                        required
                        minLength={6}
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="h-9 text-[13px] rounded-sm" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[12px]">Confirm New Password</Label>
                      <Input 
                        type="password" 
                        required
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="h-9 text-[13px] rounded-sm" 
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="w-full h-8 text-[12px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95"
                    >
                      {changePasswordMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Update Password"}
                    </Button>
                  </form>
                </div>
              </div>



              {/* Danger Zone */}
              <div className="border border-red-500/25 rounded-sm p-5 bg-red-500/5 md:col-span-2 flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-red-400">Danger Zone</h3>
                  <p className="text-[12px] text-red-400/70 mt-1">Permanently delete your profile data, campaign listings, application histories, and auth metadata.</p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="h-8 text-[12px] rounded-sm bg-red-600 hover:bg-red-500"
                >
                  <Trash className="h-3.5 w-3.5 mr-1" /> Delete Account
                </Button>
              </div>

            </div>
          )}

          {/* 2. Notification Preferences Tab */}
          {activeTab === "notifications" && (
            <div className="border border-border rounded-sm bg-background divide-y divide-border">
              
              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="notif-email">Email Notifications</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Receive primary workspace alerts directly in your inbox.</p>
                </div>
                <Switch id="notif-email" checked={notifs.email} onCheckedChange={(val) => updateNotif("email", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="notif-app">Application Status Updates</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Get notified when brief pitches are pending, accepted, or reviewed.</p>
                </div>
                <Switch id="notif-app" checked={notifs.appUpdates} onCheckedChange={(val) => updateNotif("appUpdates", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="notif-collab">New Collaboration Opportunities</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Hear about newly listed campaigns matching your location and niche.</p>
                </div>
                <Switch id="notif-collab" checked={notifs.collabs} onCheckedChange={(val) => updateNotif("collabs", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="notif-messages">Brand Messages</Label>
                    <span className="inline-flex border border-border px-1.5 py-0.2 text-[8px] uppercase tracking-wider text-muted-foreground rounded-sm">Future Ready</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Instant chat messaging notification alerts when brands message you.</p>
                </div>
                <Switch id="notif-messages" checked={notifs.messages} onCheckedChange={(val) => updateNotif("messages", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="notif-marketing">Marketing Emails</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Receive promo updates, partnership newsletters, and marketing materials.</p>
                </div>
                <Switch id="notif-marketing" checked={notifs.marketing} onCheckedChange={(val) => updateNotif("marketing", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="notif-digest">Weekly Digest</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Get a summarized review of trending Pune creators and campaign briefs.</p>
                </div>
                <Switch id="notif-digest" checked={notifs.digest} onCheckedChange={(val) => updateNotif("digest", val)} />
              </div>

            </div>
          )}

          {/* 3. Privacy Settings Tab */}
          {activeTab === "privacy" && (
            <div className="border border-border rounded-sm bg-background divide-y divide-border">
              
              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="priv-public">Profile Visibility (Public)</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Allow guests and search indexers to access your profile data.</p>
                </div>
                <Switch id="priv-public" checked={privacy.publicProfile} onCheckedChange={(val) => updatePrivacy("publicProfile", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="priv-followers">Show Follower Count</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Display verified social audience sizes on your cards.</p>
                </div>
                <Switch id="priv-followers" checked={privacy.showFollowers} onCheckedChange={(val) => updatePrivacy("showFollowers", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="priv-contact">Show Contact Information</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Allow brands/creators to see direct email details when pitch is accepted.</p>
                </div>
                <Switch id="priv-contact" checked={privacy.showContact} onCheckedChange={(val) => updatePrivacy("showContact", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="priv-discover">Discoverability</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Allow Pune brands to query your creator profile on the creator lookup directory.</p>
                </div>
                <Switch id="priv-discover" checked={privacy.discoverable} onCheckedChange={(val) => updatePrivacy("discoverable", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="priv-search">Search Visibility</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Allow users to search your brand/influencer handle inside marketplace search bars.</p>
                </div>
                <Switch id="priv-search" checked={privacy.searchVisible} onCheckedChange={(val) => updatePrivacy("searchVisible", val)} />
              </div>

            </div>
          )}

          {/* 4. Preferences Tab */}
          {activeTab === "preferences" && (
            <div className="border border-border rounded-sm p-6 bg-background space-y-4">
              <h3 className="text-[14px] font-semibold">General Preferences</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Language Selection</Label>
                  <Select value={prefs.language} onValueChange={(val) => updatePref("language", val)}>
                    <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English (UK)</SelectItem>
                      <SelectItem value="us">English (US)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px]">Time Zone</Label>
                  <Select value={prefs.timeZone} onValueChange={(val) => updatePref("timeZone", val)}>
                    <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IST">IST (GMT+5:30) - Pune</SelectItem>
                      <SelectItem value="GMT">GMT (GMT+0:00)</SelectItem>
                      <SelectItem value="EST">EST (GMT-5:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px]">Default City/Location</Label>
                  <Input value={prefs.location} onChange={(e) => updatePref("location", e.target.value)} className="h-9 text-[13px] rounded-sm" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px]">Default Gig Category</Label>
                  <Select value={prefs.category} onValueChange={(val) => updatePref("category", val)}>
                    <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cafe">Cafe</SelectItem>
                      <SelectItem value="Food">Food & Beverage</SelectItem>
                      <SelectItem value="Fashion">Fashion</SelectItem>
                      <SelectItem value="Fitness">Fitness & Wellness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px]">Date Format</Label>
                  <Select value={prefs.dateFormat} onValueChange={(val) => updatePref("dateFormat", val)}>
                    <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px]">Theme Preference</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark Theme</SelectItem>
                      <SelectItem value="light">Light Theme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>
          )}

          {/* 5. Help & Support Tab */}
          {activeTab === "support" && (
            <div className="grid md:grid-cols-3 gap-4">
              
              {/* Accordion list */}
              <div className="border border-border rounded-sm p-5 bg-background md:col-span-2 space-y-4">
                <h3 className="text-[14px] font-semibold">Frequently Asked Questions</h3>
                <Accordion type="single" collapsible className="w-full">

                  {/* Credit Q&A — brand vs creator, driven by the shared credit constants */}
                  {user?.role === "BRAND" && (
                    <>
                      <AccordionItem value="credit-b1" className="border-border">
                        <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">How do credits work for my brand?</AccordionTrigger>
                        <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                          You get a one-time trial pack of <strong className="text-foreground">{TRIAL_CREDITS} credits</strong> when you join. Credits are only spent on two actions — posting a collab brief and hiring a creator. Browsing creators, receiving pitches, and messaging are always free.
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="credit-b2" className="border-border">
                        <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">How many credits does posting a collab cost?</AccordionTrigger>
                        <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                          Posting a brief costs <strong className="text-foreground">{GIG_POST_COST} credits</strong>, charged the moment it goes live. If the post fails to publish for any reason, those credits are automatically refunded to your balance.
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="credit-b3" className="border-border">
                        <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">How much does hiring a creator cost?</AccordionTrigger>
                        <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                          Hiring (accepting a pitch) is priced by the creator's Instagram follower tier: <strong className="text-foreground">Nano</strong> (under 1,000 followers) costs <strong className="text-foreground">{TIER_COST.NANO} credits</strong>, and <strong className="text-foreground">Micro</strong> (1,000–10,000 followers) costs <strong className="text-foreground">{TIER_COST.MICRO} credits</strong>. Mid-tier creators (over 10,000 followers) are locked during the trial and can't be hired yet.
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="credit-b4" className="border-border">
                        <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">What happens when I run out of credits?</AccordionTrigger>
                        <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                          Actions that cost credits are blocked once your balance is too low — you'll see an "insufficient credits" message when posting or hiring. Your existing briefs and past hires are unaffected. Paid credit packs to top up beyond the trial are coming soon.
                        </AccordionContent>
                      </AccordionItem>
                    </>
                  )}

                  {user?.role === "INFLUENCER" && (
                    <>
                      <AccordionItem value="credit-c1" className="border-border">
                        <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">How do I earn credits?</AccordionTrigger>
                        <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                          You start at <strong className="text-foreground">0 credits</strong> and earn them when a brand hires you — that is, accepts your pitch on one of their briefs. Browsing gigs and sending pitches is always free; nothing is deducted from you.
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="credit-c2" className="border-border">
                        <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">How many credits do I earn per hire?</AccordionTrigger>
                        <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                          You earn exactly what the brand spends to hire you, based on your Instagram follower tier: <strong className="text-foreground">Nano</strong> (under 1,000 followers) earns <strong className="text-foreground">{TIER_COST.NANO} credits</strong>, and <strong className="text-foreground">Micro</strong> (1,000–10,000 followers) earns <strong className="text-foreground">{TIER_COST.MICRO} credits</strong> per accepted collab.
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="credit-c3" className="border-border">
                        <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">When are earned credits added to my balance?</AccordionTrigger>
                        <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                          Instantly. The moment a brand accepts your pitch, the brand's spend and your earning happen together in a single transaction, so your balance updates the same second you're hired.
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="credit-c4" className="border-border">
                        <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">Why can larger creators not be hired yet?</AccordionTrigger>
                        <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                          Mid-tier creators (over 10,000 followers) are locked during the trial period — there's no paid pack yet for brands to unlock those hires. This is temporary and opens up as paid tiers launch, so growing past 10,000 followers won't lock you out permanently.
                        </AccordionContent>
                      </AccordionItem>
                    </>
                  )}

                  <AccordionItem value="item-1" className="border-border">
                    <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">How do I verify my follower count?</AccordionTrigger>
                    <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                      Link your Instagram Professional account via Meta API on the Profile page, and sync. Our system queries verified metrics securely from the Meta Graph API.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2" className="border-border">
                    <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">Are my messages with brands encrypted?</AccordionTrigger>
                    <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                      Yes, all conversations are transmitted securely over HTTPS/TLS and saved in encrypted database tables inside Supabase. Only you and the brand can read them.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-border">
                    <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">How long does brief review take?</AccordionTrigger>
                    <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                      Campaign briefs are posted instantly once clicked. Brands will reach out directly on the platform by reviewing creator applications under their pitches panel.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Channels list */}
              <div className="flex flex-col gap-4">
                
                <div className="border border-border rounded-sm p-5 bg-background text-center space-y-2">
                  <h4 className="text-[13px] font-semibold">Contact Support</h4>
                  <p className="text-[11px] text-muted-foreground">Get help via email</p>
                  <div className="pt-1">
                    <a href="mailto:support@youcollab.in" className="inline-block text-[11px] font-semibold text-foreground hover:underline uppercase tracking-wider">Email Support</a>
                  </div>
                </div>

                <div className="border border-border rounded-sm p-5 bg-background text-center space-y-2">
                  <h4 className="text-[13px] font-semibold">Report a Problem</h4>
                  <p className="text-[11px] text-muted-foreground">Email us the details directly</p>
                  <div className="pt-1">
                    <a
                      href={`mailto:support@youcollab.in?subject=${encodeURIComponent("Bug report from " + (user?.email ?? "a user"))}`}
                      className="inline-block text-[11px] font-semibold text-foreground hover:underline uppercase tracking-wider"
                    >
                      Report Bug
                    </a>
                  </div>
                </div>

                <div className="border border-border rounded-sm p-5 bg-background text-center space-y-2">
                  <h4 className="text-[13px] font-semibold">Terms & Privacy</h4>
                  <p className="text-[11px] text-muted-foreground">Legal guidelines</p>
                  <div className="pt-1 flex justify-center gap-3">
                    <button onClick={() => toast({ title: "Terms of Service — coming soon" })} className="text-[11px] font-semibold text-foreground hover:underline uppercase tracking-wider">Terms</button>
                    <button onClick={() => toast({ title: "Privacy Policy — coming soon" })} className="text-[11px] font-semibold text-foreground hover:underline uppercase tracking-wider">Privacy</button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </main>

      {/* Account Deletion Confirmation Dialog matching dashboard dialogue */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="border-border text-foreground max-w-sm rounded-sm bg-background">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-400">Delete Account Permanently?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              This action cannot be undone. This will permanently delete your user profile and all campaign mappings.
              Please type <strong className="text-foreground">DELETE</strong> below to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2.5">
            <Input 
              value={deleteConfirmText} 
              onChange={(e) => setDeleteConfirmText(e.target.value)} 
              placeholder='Type "DELETE"' 
              className="text-xs h-9 rounded-sm" 
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmText(""); }} className="h-9 text-xs rounded-sm hover:bg-zinc-800">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteAccountMutation.isPending} className="h-9 text-xs rounded-sm bg-red-600 hover:bg-red-500">
              {deleteAccountMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
