import { Link } from "react-router-dom";
import { Plus, IndianRupee, Calendar, MapPin, Users, Briefcase, Eye, Edit3, Trash2, Play, Pause } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { gigsService } from "@/services/gigs";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";

export default function BrandDashboard() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  
  const { data: gigs = [], isLoading } = useQuery({ 
    queryKey: ["gigs", "mine"], 
    queryFn: gigsService.mine 
  });

  const toggleStatus = useMutation({
    mutationFn: (id: string) => gigsService.toggleStatus(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["gigs", "mine"] });
      toast({ title: data.status === "OPEN" ? "Campaign is now live! 🎉" : "Campaign paused." });
    },
    onError: () => toast({ variant: "destructive", title: "Action failed", description: "Could not update campaign status." }),
  });

  const deleteGig = useMutation({
    mutationFn: (id: string) => gigsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gigs", "mine"] });
      toast({ title: "Campaign deleted permanently." });
    },
    onError: () => toast({ variant: "destructive", title: "Delete failed", description: "Could not delete this campaign BRIEF." }),
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to permanently delete this gig? All applications will be lost.")) {
      deleteGig.mutate(id);
    }
  };

  const activeCount = gigs.filter((g) => g.status === "OPEN").length;
  const totalPitches = gigs.reduce((sum, g) => sum + ((g as any)._count?.applications || 0), 0);
  const totalViews = gigs.reduce((sum, g) => sum + ((g as any).viewCount || 0), 0);

  const stats = [
    { label: "Active campaigns", value: String(activeCount), Icon: Briefcase },
    { label: "Total Views", value: String(totalViews), Icon: Eye },
    { label: "Pitches received", value: String(totalPitches), Icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-[1200px] px-6 py-10 space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm mb-3">Brand</span>
            <h1 className="text-3xl font-semibold tracking-tight">Welcome, {user?.name ?? "Brand"}.</h1>
            <p className="text-[13px] text-muted-foreground mt-1">Manage campaigns and review creator pitches.</p>
          </div>
          <Button asChild className="h-9 text-[13px] rounded-sm">
            <Link to="/gigs/new"><Plus className="h-3.5 w-3.5 mr-1" /> Post a Gig</Link>
          </Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="border border-border rounded-sm p-4 flex items-center gap-3 bg-background">
              <div className="h-9 w-9 rounded-sm border border-border flex items-center justify-center">
                <s.Icon className="h-4 w-4 text-foreground/70" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold tracking-tight">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold tracking-tight">Your gigs</h2>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{gigs.length} Briefs total</span>
          </div>
          {isLoading ? (
            <div className="border border-border rounded-sm p-10 text-center text-[13px] text-muted-foreground">Loading…</div>
          ) : gigs.length === 0 ? (
            <div className="border border-border rounded-sm p-10 text-center">
              <p className="text-muted-foreground text-[13px]">No gigs yet — post your first brief.</p>
              <Button asChild className="mt-4 h-9 text-[13px] rounded-sm">
                <Link to="/gigs/new"><Plus className="h-3.5 w-3.5 mr-1" /> Post a Gig</Link>
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gigs.map((g) => (
                <div key={g.id} className="border border-border rounded-sm p-5 bg-background hover:bg-muted/40 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {g.city || "Pune"}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${g.status === "OPEN" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/25"}`}>{g.status}</span>
                        <span className="text-foreground font-medium">{g.category}</span>
                      </div>
                    </div>
                    <h3 className="mt-3 text-[14px] font-semibold line-clamp-2">{g.title}</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">{g.deliverables}</p>
                    <div className="mt-3 flex items-center justify-between text-[12px]">
                      <span className="inline-flex items-center gap-0.5 font-medium">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {g.budgetMin?.toLocaleString()}–{g.budgetMax?.toLocaleString()}
                      </span>
                      {g.deadline && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
                          <Calendar className="h-3 w-3" /> {new Date(g.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-5 flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1 h-8 text-[12px] rounded-sm">
                      <Link to={`/gigs/${g.id}/applicants`}>View applicants ({(g as any)._count?.applications || 0})</Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-sm shrink-0 border border-border" title="Edit campaign brief">
                      <Link to={`/gigs/${g.id}/edit`}><Edit3 className="h-3.5 w-3.5" /></Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-sm shrink-0 border border-border" 
                      title={g.status === "OPEN" ? "Pause campaign" : "Publish campaign"}
                      onClick={() => toggleStatus.mutate(g.id)}
                      disabled={toggleStatus.isPending}
                    >
                      {g.status === "OPEN" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-sm shrink-0 border border-border hover:bg-destructive/15 hover:text-destructive text-muted-foreground" 
                      title="Permanently delete campaign"
                      onClick={() => handleDelete(g.id)}
                      disabled={deleteGig.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
