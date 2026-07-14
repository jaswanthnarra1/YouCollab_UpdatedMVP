import { applicationsService } from "@/services/applications";
import {
  ArrowLeft, Calendar, IndianRupee, MapPin, Loader2,
  Send, ExternalLink, Globe, CheckCircle2, XCircle, AlertCircle, Edit3
} from "lucide-react";
import { Button } from "@/components/common/button";
import { gigsService } from "@/services/gigs";
import { Textarea } from "@/components/common/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function GigDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [coverNote, setCoverNote] = useState("");

  const { data: gig, isLoading, error } = useQuery({
    queryKey: ["gig", id],
    queryFn: () => gigsService.get(id),
    enabled: !!id,
  });

  const apply = useMutation({
    mutationFn: () => applicationsService.apply(id, coverNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gig", id] });
      qc.invalidateQueries({ queryKey: ["myApplications"] });
      toast({ title: "Pitch sent successfully! 🚀", description: "The brand will review your profile shortly." });
      setCoverNote("");
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast({ variant: "destructive", title: "Apply failed", description: err?.response?.data?.message ?? "Try again." }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-[1200px] px-6 py-20 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-semibold tracking-tight">Gig not found</h1>
          <p className="text-[13px] text-muted-foreground">The brief you are looking for does not exist or was deleted.</p>
          <Button asChild variant="outline" className="h-9 text-[13px] rounded-sm">
            <Link to="/marketplace">Go to Marketplace</Link>
          </Button>
        </main>
      </div>
    );
  }

  const isOwner = user?.role === "BRAND" && (gig as any).brandId === user?.profile?.id;
  const hasApplied = (gig as any).hasApplied;
  const application = (gig as any).application;
  const brand = (gig as any).brand;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-[1200px] px-6 py-10 space-y-8">
        <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {/* Header banner */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm">{gig.category}</span>
            {gig.platform && <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm">{gig.platform}</span>}
            {gig.campaignType && <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm">{gig.campaignType}</span>}
            <span className="inline-flex items-center gap-1 border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm">
              <MapPin className="h-3 w-3" /> {gig.city}
            </span>
            <span className={`inline-block px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] rounded-sm border ${
              gig.status === "OPEN" ? "border-emerald-500/25 text-emerald-400 bg-emerald-500/10" : "border-border text-muted-foreground"
            }`}>{gig.status}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{gig.title}</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="md:col-span-2 space-y-6">
            <div className="border border-border rounded-sm p-5 bg-background grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 border border-border rounded-sm flex items-center justify-center bg-muted/20 shrink-0">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Budget range</p>
                  <p className="text-[13px] font-semibold mt-0.5">₹{gig.budgetMin?.toLocaleString()} - {gig.budgetMax ? `₹${gig.budgetMax.toLocaleString()}` : "No limit"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 border border-border rounded-sm flex items-center justify-center bg-muted/20 shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Deadline</p>
                  <p className="text-[13px] font-semibold mt-0.5">{new Date(gig.deadline).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Campaign Brief */}
            <div className="border border-border rounded-sm p-5 bg-background space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Campaign Description</h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{gig.description}</p>
              </div>
              <div className="pt-4 border-t border-border/60">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Deliverables Expected</h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{gig.deliverables}</p>
              </div>
              <div className="pt-4 border-t border-border/60">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Creator Requirements</h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{gig.creatorRequirements || "No specific requirements outlined."}</p>
              </div>
            </div>

            {/* Application Section */}
            {user?.role === "INFLUENCER" && (
              <div className="border border-primary/25 rounded-sm p-5 bg-primary/5 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Pitch</h3>

                {hasApplied ? (
                  <div className="space-y-4">
                    <div className={`p-3 border rounded-sm flex items-start gap-3 text-[12px] ${
                      application?.status === "ACCEPTED"
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                        : application?.status === "REJECTED"
                        ? "bg-red-500/10 border-red-500/25 text-red-400"
                        : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                    }`}>
                      {application?.status === "ACCEPTED" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                      {application?.status === "REJECTED" && <XCircle className="h-4 w-4 shrink-0" />}
                      {application?.status === "PENDING" && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
                      <div>
                        <h4 className="font-semibold">Pitch Status: {application?.status}</h4>
                        <p className="text-muted-foreground mt-0.5">
                          {application?.status === "ACCEPTED" && "Congratulations! The brand has accepted your pitch. Check your messages/inbox."}
                          {application?.status === "REJECTED" && "The brand has reviewed your pitch and decided to pass on this collab brief. Keep applying!"}
                          {application?.status === "PENDING" && "Pitch submitted. The brand is currently reviewing your profile & engagement metrics."}
                        </p>
                      </div>
                    </div>

                    <div className="border border-border/60 rounded-sm p-3 bg-background">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Your Cover Message</p>
                      <p className="text-[12px] italic text-muted-foreground whitespace-pre-wrap">"{application?.coverNote}"</p>
                    </div>
                  </div>
                ) : gig.status !== "OPEN" ? (
                  <p className="text-[13px] text-muted-foreground">Applications are now closed for this collab campaign.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[12px] text-muted-foreground">Introduce yourself and outline why you are the ideal fit for this collab campaign brief.</p>
                    <Textarea
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      rows={5}
                      placeholder="Hi brand! I have a strong following in Koregaon Park and specialize in culinary reviews..."
                      className="rounded-sm text-[13px] border-border"
                    />
                    <Button
                      onClick={() => apply.mutate()}
                      disabled={!coverNote.trim() || apply.isPending}
                      className="w-full h-9 rounded-sm bg-gradient-brand text-primary-foreground border-0 text-[13px]"
                    >
                      {apply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1" /> Send Pitch brief</>}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isOwner && (
              <div className="border border-border rounded-sm p-5 bg-background flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div>
                  <h4 className="font-semibold text-[13px]">You own this Brief</h4>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Manage details or view current submissions.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                  <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial h-9 rounded-sm text-[13px]">
                    <Link to={`/gigs/${gig.id}/edit`}><Edit3 className="h-3.5 w-3.5 mr-1" /> Edit brief</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1 sm:flex-initial h-9 rounded-sm text-[13px] bg-gradient-brand text-primary-foreground border-0">
                    <Link to={`/gigs/${gig.id}/applicants`}>View pitches</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right column — brand info */}
          <div className="space-y-6">
            <div className="border border-border rounded-sm p-5 bg-background space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">About the Brand</h3>

              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-sm bg-gradient-brand shrink-0 flex items-center justify-center text-primary-foreground font-bold text-lg overflow-hidden border border-border">
                  {brand?.logoUrl ? (
                    <img src={brand.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (brand?.businessName || "B")[0]
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-[14px] truncate">{brand?.businessName || "Anonymous Brand"}</h4>
                  <p className="text-[12px] text-muted-foreground truncate">{brand?.category || "Category"}</p>
                </div>
              </div>

              {brand?.bio && (
                <p className="text-[12px] text-muted-foreground leading-relaxed">{brand.bio}</p>
              )}

              <div className="pt-3 border-t border-border/60 space-y-2 text-[12px]">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{brand?.location || "Pune"}</span>
                </div>

                {brand?.website && (
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Visit Website</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
