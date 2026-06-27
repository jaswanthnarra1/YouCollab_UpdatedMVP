import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";

type TabType = 
  | "account" 
  | "notifications" 
  | "privacy" 
  | "preferences" 
  | "support";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("account");

  // General loading states
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // 1. Account & Security Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // 2. Notification Preference States
  const [notifs, setNotifs] = useState({
    email: true,
    appUpdates: true,
    collabs: true,
    messages: true,
    marketing: false,
    digest: true,
  });

  // 3. Privacy Preference States
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showFollowers: true,
    showContact: false,
    discoverable: true,
    searchVisible: true,
  });

  // 4. Connected Accounts States
  const [connections, setConnections] = useState({
    instagram: true,
    youtube: false,
    tiktok: false,
    linkedin: false,
  });
  const [igSyncTime, setIgSyncTime] = useState("Just now");

  // 5. Preferences States
  const [prefs, setPrefs] = useState({
    language: "en",
    timeZone: "IST",
    location: "Pune",
    category: "Cafe",
    dateFormat: "DD/MM/YYYY",
    theme: "dark",
  });

  // 6. Session States
  const [sessions, setSessions] = useState([
    { id: "s1", device: "Windows Desktop", browser: "Google Chrome", location: "Pune, India", active: true, time: "Active now" },
    { id: "s2", device: "iPhone 15 Pro", browser: "Safari Mobile", location: "Pune, India", active: false, time: "Yesterday, 8:42 PM" },
    { id: "s3", device: "MacBook Air", browser: "Safari Browser", location: "Mumbai, India", active: false, time: "3 days ago" },
  ]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedNotifs = localStorage.getItem("yc.settings.notifs");
    if (savedNotifs) setNotifs(JSON.parse(savedNotifs));

    const savedPrivacy = localStorage.getItem("yc.settings.privacy");
    if (savedPrivacy) setPrivacy(JSON.parse(savedPrivacy));

    const savedPrefs = localStorage.getItem("yc.settings.prefs");
    if (savedPrefs) setPrefs(JSON.parse(savedPrefs));

    const savedConnections = localStorage.getItem("yc.settings.connections");
    if (savedConnections) setConnections(JSON.parse(savedConnections));
  }, []);

  // Sync preference helpers
  const updateNotif = (key: keyof typeof notifs, value: boolean) => {
    const updated = { ...notifs, [key]: value };
    setNotifs(updated);
    localStorage.setItem("yc.settings.notifs", JSON.stringify(updated));
    toast({ title: "Notification preference updated" });
  };

  const updatePrivacy = (key: keyof typeof privacy, value: boolean) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    localStorage.setItem("yc.settings.privacy", JSON.stringify(updated));
    toast({ title: "Privacy preference updated" });
  };

  const updatePref = (key: keyof typeof prefs, value: string) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    localStorage.setItem("yc.settings.prefs", JSON.stringify(updated));
    toast({ title: "General preferences updated" });
  };

  const toggleConnection = (key: keyof typeof connections) => {
    const updated = { ...connections, [key]: !connections[key] };
    setConnections(updated);
    localStorage.setItem("yc.settings.connections", JSON.stringify(updated));
    if (updated[key]) {
      toast({ title: "Account connected successfully! 🔗" });
    } else {
      toast({ title: "Account disconnected." });
    }
  };

  // Account management actions
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ variant: "destructive", title: "Fill all password fields" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords mismatch", description: "New password and confirm password do not match." });
      return;
    }

    setLoadingAction("password");
    // Mock request
    setTimeout(() => {
      setLoadingAction(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated successfully! 🔐" });
    }, 1500);
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) {
      toast({ variant: "destructive", title: "Email is required" });
      return;
    }

    setLoadingAction("email");
    // Mock request
    setTimeout(() => {
      setLoadingAction(null);
      setNewEmail("");
      setIsEmailVerified(false);
      toast({ title: "Verification email sent! ✉️", description: "Please check your inbox to confirm the change." });
    }, 1500);
  };

  const handleVerifyEmailStatus = () => {
    if (isEmailVerified) return;
    setLoadingAction("verifyEmail");
    setTimeout(() => {
      setLoadingAction(null);
      setIsEmailVerified(true);
      toast({ title: "Email verified successfully!" });
    }, 1200);
  };

  const handleRevokeSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    toast({ title: "Session revoked successfully." });
  };

  const handleRevokeAllOtherSessions = () => {
    setSessions(sessions.filter(s => s.active));
    toast({ title: "All other active sessions revoked." });
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "DELETE") {
      toast({ variant: "destructive", title: "Confirmation mismatch", description: 'Please type "DELETE" to confirm.' });
      return;
    }
    setIsDeleteModalOpen(false);
    logout();
    toast({ title: "Account deleted permanently." });
    navigate("/");
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
    <div className="relative min-h-screen overflow-hidden text-foreground">
      <div className="absolute inset-0 neon-grid pointer-events-none" />
      
      <main className="relative mx-auto max-w-5xl px-4 pt-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="chip mb-3"><Sparkles className="h-3 w-3 text-primary" /> Workspace configuration</div>
          <h1 className="text-3xl font-semibold font-sans">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage security credentials, integrations, preferences, and support access.</p>
        </motion.div>

        <div className="grid md:grid-cols-12 gap-8 items-start">
          {/* Navigation Sidebar Panel */}
          <div className="md:col-span-4 space-y-1 bg-[#0B0D17]/40 border border-border/60 backdrop-blur-xl p-3 rounded-2xl">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === cat.id 
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/40"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Settings Panel Content */}
          <div className="md:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="glass-strong rounded-3xl p-6 space-y-6"
              >
                {/* 1. Account & Security Tab */}
                {activeTab === "account" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold font-sans">Account & Security</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Control password credentials, email aliases, and auth integrations.</p>
                    </div>

                    {/* Email settings card */}
                    <div className="border border-border/50 rounded-2xl p-5 space-y-4 bg-[#08090E]/60">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                        <Mail className="h-4 w-4 text-primary" /> Email Address
                      </h3>
                      <div className="flex items-center justify-between gap-4 py-2 border-b border-border/30">
                        <div>
                          <p className="text-xs text-muted-foreground">Current Email</p>
                          <p className="text-sm font-medium mt-0.5">{user?.email || "not-available@youcollab.in"}</p>
                        </div>
                        <div>
                          {isEmailVerified ? (
                            <span className="chip bg-green-500/10 border-green-500/25 text-green-400">
                              <BadgeCheck className="h-3 w-3" /> Verified
                            </span>
                          ) : (
                            <Button 
                              onClick={handleVerifyEmailStatus} 
                              disabled={loadingAction === "verifyEmail"}
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] uppercase tracking-wider rounded-sm text-yellow-500 border-yellow-500/35 bg-yellow-500/5 hover:bg-yellow-500/10"
                            >
                              {loadingAction === "verifyEmail" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify status"}
                            </Button>
                          )}
                        </div>
                      </div>

                      <form onSubmit={handleChangeEmail} className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">New email address</Label>
                          <div className="flex gap-2">
                            <Input 
                              type="email" 
                              value={newEmail} 
                              onChange={(e) => setNewEmail(e.target.value)} 
                              placeholder="new-email@example.com" 
                              className="glass h-9 text-xs" 
                            />
                            <Button 
                              type="submit" 
                              disabled={loadingAction === "email"} 
                              className="h-9 text-xs px-4"
                            >
                              {loadingAction === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </div>

                    {/* Change password card */}
                    <form onSubmit={handleChangePassword} className="border border-border/50 rounded-2xl p-5 space-y-4 bg-[#08090E]/60">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                        <Key className="h-4 w-4 text-primary" /> Update Password
                      </h3>
                      <div className="space-y-3.5">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Current Password</Label>
                          <Input 
                            type="password" 
                            value={currentPassword} 
                            onChange={(e) => setCurrentPassword(e.target.value)} 
                            placeholder="••••••••" 
                            className="glass h-9 text-xs" 
                          />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">New Password</Label>
                            <Input 
                              type="password" 
                              value={newPassword} 
                              onChange={(e) => setNewPassword(e.target.value)} 
                              placeholder="••••••••" 
                              className="glass h-9 text-xs" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Confirm New Password</Label>
                            <Input 
                              type="password" 
                              value={confirmPassword} 
                              onChange={(e) => setConfirmPassword(e.target.value)} 
                              placeholder="••••••••" 
                              className="glass h-9 text-xs" 
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button 
                          type="submit" 
                          disabled={loadingAction === "password"} 
                          className="h-9 text-xs px-4"
                        >
                          {loadingAction === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                        </Button>
                      </div>
                    </form>

                    {/* Two-Factor Authenticator */}
                    <div className="flex items-center justify-between border border-border/50 rounded-2xl p-5 bg-[#08090E]/60">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-foreground">Two-Factor Authentication</h3>
                          <span className="chip border-primary/20 text-[9px] py-0 px-2 uppercase tracking-widest text-primary bg-primary/5">Coming Soon</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Add an extra layer of protection to your collaboration account.</p>
                      </div>
                      <Switch checked={tfaEnabled} onCheckedChange={setTfaEnabled} disabled />
                    </div>

                    {/* Delete account */}
                    <div className="border border-red-500/20 rounded-2xl p-5 space-y-3 bg-red-500/5">
                      <h3 className="font-semibold text-sm text-red-400">Danger Zone</h3>
                      <p className="text-xs text-muted-foreground">Permanently delete your profile data, campaign listings, application histories, and auth metadata.</p>
                      <div className="pt-2">
                        <Button 
                          variant="destructive" 
                          onClick={() => setIsDeleteModalOpen(true)}
                          className="h-9 text-xs px-4 bg-red-600 hover:bg-red-500"
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" /> Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Notification Preferences Tab */}
                {activeTab === "notifications" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold font-sans">Notification Preferences</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Control what updates you receive via push and email alerts.</p>
                    </div>

                    <div className="divide-y divide-border/40 border border-border/50 rounded-2xl overflow-hidden bg-[#08090E]/60">
                      <div className="flex items-center justify-between p-4.5">
                        <div>
                          <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="notif-email">Email Notifications</Label>
                          <p className="text-xs text-muted-foreground">Receive primary workspace alerts directly in your inbox.</p>
                        </div>
                        <Switch id="notif-email" checked={notifs.email} onCheckedChange={(val) => updateNotif("email", val)} />
                      </div>

                      <div className="flex items-center justify-between p-4.5">
                        <div>
                          <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="notif-app">Application Status Updates</Label>
                          <p className="text-xs text-muted-foreground">Get notified when brief pitches are pending, accepted, or reviewed.</p>
                        </div>
                        <Switch id="notif-app" checked={notifs.appUpdates} onCheckedChange={(val) => updateNotif("appUpdates", val)} />
                      </div>

                      <div className="flex items-center justify-between p-4.5">
                        <div>
                          <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="notif-collab">New Collaboration Opportunities</Label>
                          <p className="text-xs text-muted-foreground">Hear about newly listed campaigns matching your location and niche.</p>
                        </div>
                        <Switch id="notif-collab" checked={notifs.collabs} onCheckedChange={(val) => updateNotif("collabs", val)} />
                      </div>

                      <div className="flex items-center justify-between p-4.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="notif-messages">Brand Messages</Label>
                            <span className="text-[9px] border border-primary/20 text-primary px-1.5 rounded uppercase font-medium bg-primary/5 tracking-wider">Future Ready</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Instant chat messaging notification alerts when brands message you.</p>
                        </div>
                        <Switch id="notif-messages" checked={notifs.messages} onCheckedChange={(val) => updateNotif("messages", val)} />
                      </div>

                      <div className="flex items-center justify-between p-4.5">
                        <div>
                          <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="notif-marketing">Marketing Emails</Label>
                          <p className="text-xs text-muted-foreground">Receive promo updates, partnership newsletters, and marketing materials.</p>
                        </div>
                        <Switch id="notif-marketing" checked={notifs.marketing} onCheckedChange={(val) => updateNotif("marketing", val)} />
                      </div>

                      <div className="flex items-center justify-between p-4.5">
                        <div>
                          <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="notif-digest">Weekly Digest</Label>
                          <p className="text-xs text-muted-foreground">Get a summarized review of trending Pune creators and campaign briefs.</p>
                        </div>
                        <Switch id="notif-digest" checked={notifs.digest} onCheckedChange={(val) => updateNotif("digest", val)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Privacy Settings Tab */}
                {activeTab === "privacy" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold font-sans">Privacy Settings</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Manage visibility constraints for your creator portfolio or business profile.</p>
                    </div>

                    <div className="divide-y divide-border/40 border border-border/50 rounded-2xl overflow-hidden bg-[#08090E]/60">
                      <div className="flex items-center justify-between p-4.5">
                        <div>
                          <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="priv-public">Profile Visibility (Public)</Label>
                          <p className="text-xs text-muted-foreground">Allow guests and search indexers to access your profile data.</p>
                        </div>
                        <Switch id="priv-public" checked={privacy.publicProfile} onCheckedChange={(val) => updatePrivacy("publicProfile", val)} />
                      </div>

                      <div className="flex items-center justify-between p-4.5">
                        <div>
                          <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="priv-followers">Show Follower Count</Label>
                          <p className="text-xs text-muted-foreground">Display verified social audience sizes on your cards.</p>
                        </div>
                        <Switch id="priv-followers" checked={privacy.showFollowers} onCheckedChange={(val) => updatePrivacy("showFollowers", val)} />
                      </div>

                      <div className="flex items-center justify-between p-4.5">
                        <div>
                          <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="priv-contact">Show Contact Information</Label>
                          <p className="text-xs text-muted-foreground">Allow brands/creators to see direct email details when pitch is accepted.</p>
                        </div>
                        <Switch id="priv-contact" checked={privacy.showContact} onCheckedChange={(val) => updatePrivacy("showContact", val)} />
                      </div>

                      <div className="flex items-center justify-between p-4.5">
                        <div>
                          <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="priv-discover">Discoverability</Label>
                          <p className="text-xs text-muted-foreground">Allow Pune brands to query your creator profile on the creator lookup directory.</p>
                        </div>
                        <Switch id="priv-discover" checked={privacy.discoverable} onCheckedChange={(val) => updatePrivacy("discoverable", val)} />
                      </div>

                      <div className="flex items-center justify-between p-4.5">
                        <div>
                          <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="priv-search">Search Visibility</Label>
                          <p className="text-xs text-muted-foreground">Allow users to search your brand/influencer handle inside marketplace search bars.</p>
                        </div>
                        <Switch id="priv-search" checked={privacy.searchVisible} onCheckedChange={(val) => updatePrivacy("searchVisible", val)} />
                      </div>
                    </div>
                  </div>
                )}


                {/* 5. Preferences Tab */}
                {activeTab === "preferences" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold font-sans">Preferences</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Customize UI locale preferences, date structures, and default parameters.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 border border-border/50 rounded-2xl p-5 bg-[#08090E]/60">
                      <div className="space-y-1.5">
                        <Label>Language Selection</Label>
                        <Select value={prefs.language} onValueChange={(val) => updatePref("language", val)}>
                          <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English (UK)</SelectItem>
                            <SelectItem value="us">English (US)</SelectItem>
                            <SelectItem value="hi">Hindi (India)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Time Zone</Label>
                        <Select value={prefs.timeZone} onValueChange={(val) => updatePref("timeZone", val)}>
                          <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IST">IST (GMT+5:30) - Pune</SelectItem>
                            <SelectItem value="GMT">GMT (GMT+0:00)</SelectItem>
                            <SelectItem value="EST">EST (GMT-5:00)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Default City/Location</Label>
                        <Input value={prefs.location} onChange={(e) => updatePref("location", e.target.value)} className="glass h-10 text-sm" />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Default Gig Category</Label>
                        <Select value={prefs.category} onValueChange={(val) => updatePref("category", val)}>
                          <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cafe">Cafe</SelectItem>
                            <SelectItem value="Food">Food & Beverage</SelectItem>
                            <SelectItem value="Fashion">Fashion</SelectItem>
                            <SelectItem value="Fitness">Fitness & Wellness</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Date Format</Label>
                        <Select value={prefs.dateFormat} onValueChange={(val) => updatePref("dateFormat", val)}>
                          <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Theme Preference</Label>
                        <Select value={prefs.theme} onValueChange={(val) => updatePref("theme", val)}>
                          <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dark">Dark Theme</SelectItem>
                            <SelectItem value="light">Light Theme</SelectItem>
                            <SelectItem value="system">System Preference</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}


                {/* 7. Help & Support Tab */}
                {activeTab === "support" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold font-sans">Help & Support</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Need help with a collaboration or facing system issues? Contact our Pune team.</p>
                    </div>

                    {/* FAQ Collapsible Accordions */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-foreground border-b border-border/30 pb-2">Frequently Asked Questions</h3>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-border/40">
                          <AccordionTrigger className="text-xs hover:no-underline font-semibold text-foreground py-3">How do I verify my follower count?</AccordionTrigger>
                          <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                            Click on the <strong>Connected Accounts</strong> settings, link your Instagram Professional account via Meta API, and sync. Our system will query metrics securely and show the badge.
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2" className="border-border/40">
                          <AccordionTrigger className="text-xs hover:no-underline font-semibold text-foreground py-3">Are my messages with brands encrypted?</AccordionTrigger>
                          <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                            Yes, all correspondence is transmitted over HTTPS/TLS and saved in encrypted database tables inside Supabase. Only you and the brand can read them.
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3" className="border-border/40">
                          <AccordionTrigger className="text-xs hover:no-underline font-semibold text-foreground py-3">How long does brief review take?</AccordionTrigger>
                          <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                            Campaign briefs are posted instantly once clicked. Brands will reach out directly on the platform by reviewing creator applications under their pitches panel.
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>

                    {/* Support Channels & Documentation links */}
                    <div className="grid sm:grid-cols-3 gap-4.5 pt-2">
                      <div className="border border-border/40 p-4 rounded-xl text-center space-y-1 bg-[#08090E]/30">
                        <p className="text-xs font-semibold text-foreground">Contact Support</p>
                        <p className="text-[10px] text-muted-foreground">Get help via email</p>
                        <div className="pt-2">
                          <a href="mailto:support@youcollab.in" className="inline-block text-[11px] font-semibold text-primary hover:underline uppercase tracking-wider">Email Support</a>
                        </div>
                      </div>
                      <div className="border border-border/40 p-4 rounded-xl text-center space-y-1 bg-[#08090E]/30">
                        <p className="text-xs font-semibold text-foreground">Report a Problem</p>
                        <p className="text-[10px] text-muted-foreground">Submit a bug log</p>
                        <div className="pt-2">
                          <button onClick={() => toast({ title: "Report submitted! Thank you. 📝" })} className="text-[11px] font-semibold text-primary hover:underline uppercase tracking-wider">Report Bug</button>
                        </div>
                      </div>
                      <div className="border border-border/40 p-4 rounded-xl text-center space-y-1 bg-[#08090E]/30">
                        <p className="text-xs font-semibold text-foreground">Terms & Privacy</p>
                        <p className="text-[10px] text-muted-foreground">Legal guidelines</p>
                        <div className="pt-2 flex justify-center gap-3">
                          <button onClick={() => toast({ title: "Showing Terms & Conditions (Stub)" })} className="text-[11px] font-semibold text-primary hover:underline uppercase tracking-wider">Terms</button>
                          <button onClick={() => toast({ title: "Showing Privacy Policy (Stub)" })} className="text-[11px] font-semibold text-primary hover:underline uppercase tracking-wider">Privacy</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Account Deletion Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="glass-strong border border-red-500/20 text-foreground max-w-sm rounded-2xl">
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
              className="glass border-red-500/20 text-xs h-9" 
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmText(""); }} className="h-9 text-xs rounded-sm hover:bg-zinc-800">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} className="h-9 text-xs rounded-sm bg-red-600 hover:bg-red-500">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
