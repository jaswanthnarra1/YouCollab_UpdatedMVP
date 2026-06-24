import { Link } from "react-router-dom";
import { Plus, IndianRupee, Calendar, MapPin, Users, Briefcase, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { gigsService } from "@/services/gigs";
import { useAuthStore } from "@/stores/authStore";

export default function BrandDashboard() {
  const { user } = useAuthStore();
  const { data: gigs = [], isLoading } = useQuery({ queryKey: ["gigs", "mine"], queryFn: gigsService.list });

  const stats = [
    { label: "Active campaigns", value: String(gigs.length), Icon: Briefcase },
    { label: "Total reach planned", value: "—", Icon: Users },
    { label: "Pitches received", value: "—", Icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
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
          <h2 className="text-xl font-semibold tracking-tight mb-4">Your gigs</h2>
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
                <div key={g.id} className="border border-border rounded-sm p-5 bg-background hover:bg-muted/40 transition-colors">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {g.city || "Pune"}</span>
                    <span className="text-foreground font-medium">{g.category}</span>
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
                  <Button asChild variant="outline" size="sm" className="mt-4 w-full h-8 text-[12px] rounded-sm">
                    <Link to={`/gigs/${g.id}/applicants`}>View applicants</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
