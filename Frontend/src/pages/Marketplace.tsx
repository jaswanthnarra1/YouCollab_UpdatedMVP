import { useMemo, useState } from "react";
import { Search, MapPin, IndianRupee, Calendar, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gigsService, type Gig } from "@/services/gigs";
import { CATEGORIES } from "@/lib/constants";
import { Link } from "react-router-dom";

const PUNE_LOCATIONS = [
  "All Areas",
  "Koregaon Park",
  "FC Road",
  "Kothrud",
  "Baner",
  "Viman Nagar",
  "Kalyani Nagar",
  "Camp",
  "Shivajinagar"
] as const;

export default function Marketplace() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] = useState<string>("All Areas");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: gigs = [], isLoading } = useQuery({ 
    queryKey: ["gigs"], 
    queryFn: gigsService.list 
  });

  const filteredGigs = useMemo(() => {
    return gigs.filter((g) => {
      const matchCategory = activeCategory ? g.category === activeCategory : true;
      
      const brandLoc = (g as any).brand?.location || "";
      const matchLocation = activeLocation === "All Areas" 
        ? true 
        : brandLoc.toLowerCase().includes(activeLocation.toLowerCase()) || g.city.toLowerCase().includes(activeLocation.toLowerCase());
      
      const matchSearch = searchQuery 
        ? (g.title + g.description + (g as any).brand?.businessName || "").toLowerCase().includes(searchQuery.toLowerCase()) 
        : true;
      
      return matchCategory && matchLocation && matchSearch && g.status === "OPEN";
    });
  }, [gigs, activeCategory, activeLocation, searchQuery]);

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground">
      <div className="absolute inset-0 neon-grid pointer-events-none" />
      <main className="relative mx-auto max-w-[1200px] px-6 py-10 space-y-8">
        <div>
          <div className="chip mb-3"><Sparkles className="h-3 w-3 text-primary" /> Collab Marketplace</div>
          <h1 className="text-3xl font-semibold tracking-tight">Browse briefs in Pune</h1>
          <p className="text-sm text-muted-foreground mt-1">Connect directly with brands. Pitch in seconds.</p>
        </div>

        {/* Filters Panel */}
        <div className="glass-strong rounded-2xl p-5 space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Search gigs or brand names..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="h-9 text-[13px] pl-9 rounded-sm glass border-border/40" 
              />
            </div>

            {/* Location selector */}
            <div className="flex gap-2 items-center">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                value={activeLocation}
                onChange={(e) => setActiveLocation(e.target.value)}
                className="w-full h-9 rounded-sm glass text-[13px] border border-border/40 bg-background/50 px-2 py-1 focus:outline-none"
              >
                {PUNE_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} className="bg-[#1A1A24] text-foreground">
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Categories Horizontal Scroller */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
            <button
              onClick={() => setActiveCategory(null)}
              className={`text-[11px] uppercase tracking-wider px-2.5 py-1 border rounded-sm transition-colors ${
                activeCategory === null ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              All Gigs
            </button>
            {CATEGORIES.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id === activeCategory ? null : id)}
                className={`text-[11px] uppercase tracking-wider px-2.5 py-1 border rounded-sm inline-flex items-center gap-1 transition-colors ${
                  activeCategory === id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid display */}
        {isLoading ? (
          <div className="glass rounded-xl p-20 text-center text-[13px] text-muted-foreground">
            Loading marketplace briefs...
          </div>
        ) : filteredGigs.length === 0 ? (
          <div className="glass rounded-xl p-20 text-center text-[13px] text-muted-foreground">
            No active campaigns match your current filters. Try resetting search or locations.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGigs.map((g) => (
              <div key={g.id} className="border border-border rounded-sm p-5 bg-background flex flex-col justify-between hover:bg-muted/30 transition-colors">
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {g.city || "Pune"}</span>
                    <span className="text-foreground font-medium">{g.category}</span>
                  </div>
                  <h3 className="mt-3 text-[14px] font-semibold line-clamp-2">{g.title}</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">{g.deliverables}</p>
                  
                  {g.brand?.businessName && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Brand: <span className="text-foreground font-medium">{g.brand.businessName}</span>
                    </p>
                  )}

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
                  <Button asChild className="w-full h-8 text-[12px] rounded-sm bg-gradient-brand text-primary-foreground border-0">
                    <Link to={`/gigs/${g.id}`}>View brief & details</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
