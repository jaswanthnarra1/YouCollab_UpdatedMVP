import { useMemo, useState } from "react";
import {
  Instagram, BadgeCheck, RefreshCw, Unlink, IndianRupee, Calendar,
  MapPin, Wallet, Send, Loader2, Search, TrendingUp, Sparkles
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { gigsService, type Gig } from "@/services/gigs";
import { applicationsService } from "@/services/applications";
import { instagramService } from "@/services/instagram";
import { CATEGORIES } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";
import { Link, useNavigate } from "react-router-dom";

function StatCard({ label, value, Icon }: { label: string; value: string; Icon: typeof TrendingUp }) {
  return (
    <div className="border border-border rounded-sm p-4 flex items-center gap-3 bg-background">
      <div className="h-9 w-9 rounded-sm border border-border flex items-center justify-center">
        <Icon className="h-4 w-4 text-foreground/70" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function InstagramCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["instagramProfile"], queryFn: instagramService.profile, retry: false });

  const connect = useMutation({
    mutationFn: instagramService.connect,
    onSuccess: (d) => { if (d?.url) window.location.href = d.url; },
    onError: () => toast({ variant: "destructive", title: "Couldn't start Instagram connect" }),
  });
  const sync = useMutation({
    mutationFn: instagramService.sync,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["instagramProfile"] }); toast({ title: "Synced!" }); },
  });
  const disconnect = useMutation({
    mutationFn: instagramService.disconnect,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["instagramProfile"] }); toast({ title: "Disconnected" }); },
  });

  const connected = !!data?.isConnected;

  return (
    <div className="border border-border rounded-sm p-5 bg-background">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-sm border border-border flex items-center justify-center shrink-0 overflow-hidden">
          {connected && data?.profilePicUrl ? (
            <img src={data.profilePicUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Instagram className="h-5 w-5 text-foreground/70" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="h-12 flex items-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : connected ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[14px] font-semibold truncate">@{data?.username}</h3>
                <span className="inline-flex items-center gap-1 border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded-sm text-muted-foreground">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div><p className="text-base font-semibold">{(data?.followersCount ?? 0).toLocaleString()}</p><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Followers</p></div>
                <div><p className="text-base font-semibold">{(data?.followingCount ?? 0).toLocaleString()}</p><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Following</p></div>
                <div><p className="text-base font-semibold">{(data?.mediaCount ?? 0).toLocaleString()}</p><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Posts</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => sync.mutate()} disabled={sync.isPending} className="h-8 text-[12px] rounded-sm">
                  {sync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync now</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending} className="h-8 text-[12px] rounded-sm">
                  <Unlink className="h-3.5 w-3.5 mr-1" /> Disconnect
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-[14px] font-semibold">Connect Instagram via Meta</h3>
              <p className="text-[12px] text-muted-foreground mt-1">Verified followers, engagement & average likes — Pune brands trust verified creators 3× more.</p>
              <Button onClick={() => connect.mutate()} disabled={connect.isPending} className="mt-3 h-8 text-[12px] rounded-sm">
                {connect.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Instagram className="h-3.5 w-3.5 mr-1" /> Connect Instagram</>}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GigCard({ gig, hasApplied, status, onClick }: { gig: Gig; hasApplied: boolean; status?: string; onClick: () => void }) {
  return (
    <div className="border border-border rounded-sm p-5 w-full bg-background flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {gig.city || "Pune"}</span>
          <span className="text-foreground font-medium">{gig.category}</span>
        </div>
        <h3 className="mt-3 text-[14px] font-semibold line-clamp-2">{gig.title}</h3>
        <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">{gig.deliverables}</p>
        
        {gig.brand?.businessName && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Brand: <span className="text-foreground font-medium">{gig.brand.businessName}</span>
          </p>
        )}

        <div className="mt-3 flex items-center justify-between text-[12px]">
          <span className="inline-flex items-center gap-0.5 font-medium">
            <IndianRupee className="h-3.5 w-3.5" />
            {gig.budgetMin?.toLocaleString()}–{gig.budgetMax?.toLocaleString()}
          </span>
          {gig.deadline && (
            <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
              <Calendar className="h-3 w-3" /> {new Date(gig.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1 h-8 text-[12px] rounded-sm">
          <Link to={`/gigs/${gig.id}`}>View brief</Link>
        </Button>
        {hasApplied ? (
          <Button disabled variant="secondary" size="sm" className="flex-1 h-8 text-[12px] rounded-sm bg-zinc-500/10 text-zinc-400 border border-zinc-500/25">
            Applied ({status})
          </Button>
        ) : (
          <Button onClick={onClick} className="flex-1 h-8 text-[12px] rounded-sm bg-gradient-brand text-primary-foreground border-0">
            Pitch now
          </Button>
        )}
      </div>
    </div>
  );
}

function ApplyDialog({ gig, onClose }: { gig: Gig | null; onClose: () => void }) {
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();
  const apply = useMutation({
    mutationFn: () => applicationsService.apply(gig!.id, note),
    onSuccess: () => {
      toast({ title: "Pitch sent", description: "The brand will review and reach out." });
      qc.invalidateQueries({ queryKey: ["myApplications"] });
      setNote(""); onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast({ variant: "destructive", title: "Couldn't apply", description: e?.response?.data?.message ?? "Try again." }),
  });

  return (
    <Dialog open={!!gig} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-border max-w-lg rounded-sm bg-background">
        {gig && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight">{gig.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="border border-border px-1.5 py-0.5 rounded-sm">{gig.category}</span>
                <span className="border border-border px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {gig.city}</span>
                <span className="border border-border px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1"><IndianRupee className="h-3 w-3" /> {gig.budgetMin?.toLocaleString()}–{gig.budgetMax?.toLocaleString()}</span>
                {gig.deadline && <span className="border border-border px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(gig.deadline).toLocaleDateString()}</span>}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Brief</p>
                <p className="text-[13px] text-muted-foreground">{gig.description}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Deliverables</p>
                <p className="text-[13px] text-muted-foreground">{gig.deliverables}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Your cover note</p>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} placeholder="Why are you a great fit?" className="text-[13px] rounded-sm" />
              </div>
              <Button
                onClick={() => apply.mutate()}
                disabled={!note.trim() || apply.isPending}
                className="w-full h-9 text-[13px] rounded-sm bg-gradient-brand text-primary-foreground border-0"
              >
                {apply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1" /> Send pitch</>}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function InfluencerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openGig, setOpenGig] = useState<Gig | null>(null);
  const [tab, setTab] = useState<"gigs" | "pitches">("gigs");

  const { data: gigs = [] } = useQuery({ queryKey: ["gigs"], queryFn: gigsService.list });
  const { data: myApps = [] } = useQuery({ queryKey: ["myApplications"], queryFn: applicationsService.mine, retry: false });

  const filtered = useMemo(() => {
    return gigs.filter((g) =>
      (active ? g.category === active : true) &&
      (query ? (g.title + g.description).toLowerCase().includes(query.toLowerCase()) : true)
    );
  }, [gigs, active, query]);

  const accepted = myApps.filter((a) => a.status === "ACCEPTED").length;
  const pending = myApps.filter((a) => a.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-[1200px] px-6 py-10 space-y-10">
        <div>
          <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm mb-3">Creator</span>
          <h1 className="text-3xl font-semibold tracking-tight">Hey {user?.name?.split(" ")[0] ?? "creator"}.</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Pune brands looking to collab — fresh today.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <StatCard label="Total pitches sent" value={String(myApps.length)} Icon={Send} />
          <StatCard label="Pending reviews" value={String(pending)} Icon={TrendingUp} />
          <StatCard label="Accepted collabs" value={String(accepted)} Icon={Wallet} />
        </div>

        <InstagramCard />

        <section className="space-y-6">
          {/* Dynamic Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setTab("gigs")}
              className={`pb-3 text-sm font-semibold tracking-tight px-4 border-b-2 transition-colors ${
                tab === "gigs" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Available Gigs
            </button>
            <button
              onClick={() => setTab("pitches")}
              className={`pb-3 text-sm font-semibold tracking-tight px-4 border-b-2 transition-colors ${
                tab === "pitches" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              My Pitches ({myApps.length})
            </button>
          </div>

          {tab === "gigs" ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Browse gigs</h2>
                  <p className="text-[12px] text-muted-foreground">Filter by category or search the brief.</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search briefs..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 text-[13px] pl-9 w-64 rounded-sm" />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActive(null)}
                  className={`text-[11px] uppercase tracking-wider px-2.5 py-1 border rounded-sm transition-colors ${
                    active === null ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActive(id === active ? null : id)}
                    className={`text-[11px] uppercase tracking-wider px-2.5 py-1 border rounded-sm inline-flex items-center gap-1 transition-colors ${
                      active === id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3" /> {label}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="border border-border rounded-sm p-10 text-center text-muted-foreground text-[13px]">No gigs match your filters.</div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((g) => {
                    const existingApp = myApps.find((a) => a.gigId === g.id);
                    return (
                      <GigCard 
                        key={g.id} 
                        gig={g} 
                        hasApplied={!!existingApp} 
                        status={existingApp?.status}
                        onClick={() => setOpenGig(g)} 
                      />
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div>
              {myApps.length === 0 ? (
                <div className="border border-border rounded-sm p-10 text-center text-muted-foreground text-[13px]">
                  You haven't pitched to any gigs yet. Available gigs will appear under the first tab!
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myApps.map((a) => (
                    <div key={a.id} className="border border-border rounded-sm p-5 bg-background flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {a.gig?.city || "Pune"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${
                              a.status === "ACCEPTED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                                : a.status === "REJECTED"
                                ? "bg-red-500/10 text-red-400 border border-red-500/25"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                            }`}>
                              {a.status}
                            </span>
                            <span className="text-foreground font-medium">{a.gig?.category}</span>
                          </div>
                        </div>
                        <h3 className="mt-3 text-[14px] font-semibold line-clamp-2">{a.gig?.title}</h3>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Brand: <span className="text-foreground font-medium">{a.gig?.brand?.businessName || "Anonymous"}</span>
                        </p>
                        
                        <div className="mt-3 bg-muted/40 rounded-sm p-3 border border-border/30">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Your cover note</p>
                          <p className="text-[12px] text-muted-foreground line-clamp-3 italic">"{a.coverNote}"</p>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Button asChild variant="outline" size="sm" className="w-full h-8 text-[12px] rounded-sm">
                          <Link to={`/gigs/${a.gigId}`}>View Brief & Details</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      <ApplyDialog gig={openGig} onClose={() => setOpenGig(null)} />
    </div>
  );
}
