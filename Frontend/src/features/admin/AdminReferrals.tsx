import { ArrowLeft, ExternalLink, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/common/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Input } from "@/components/common/input";
import { Link } from "react-router-dom";
import { referralsService } from "@/services/referrals";
import type { ReferralStatus, ReferralSubmission } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

function StatusPill({ status }: { status: ReferralStatus }) {
  const cls =
    status === "ELIGIBLE" || status === "WINNER"
      ? "text-success"
      : status === "NOT_ELIGIBLE"
        ? "text-destructive"
        : "text-warning";
  const label = status === "UNDER_REVIEW" ? "Under Review" : status === "NOT_ELIGIBLE" ? "Not Eligible" : status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${cls}`}>{label}</span>;
}

function SubmissionRow({ s }: { s: ReferralSubmission }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [views, setViews] = useState(s.verifiedViews != null ? String(s.verifiedViews) : "");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "referrals"] });

  const markUnderReview = useMutation({
    mutationFn: () => referralsService.adminMarkUnderReview(s.id),
    onSuccess: () => { invalidate(); toast({ title: "Marked under review" }); },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) =>
      toast({ variant: "destructive", title: "Failed", description: e?.response?.data?.error?.message ?? "Try again." }),
  });

  const setVerifiedViews = useMutation({
    mutationFn: () => referralsService.adminSetVerifiedViews(s.id, Number(views)),
    onSuccess: (updated) => {
      invalidate();
      toast({
        title: updated.status === "ELIGIBLE" ? "Marked eligible" : "Marked not eligible",
        description: updated.status === "ELIGIBLE"
          ? "Your Reel has been verified and you're eligible for the ₹1,000 draw."
          : "Your Reel did not meet the 50,000 verified view requirement.",
      });
    },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) =>
      toast({ variant: "destructive", title: "Failed to record views", description: e?.response?.data?.error?.message ?? "Try again." }),
  });

  const markWinner = useMutation({
    mutationFn: () => referralsService.adminMarkWinner(s.id),
    onSuccess: () => { invalidate(); toast({ title: "Winner selected 🏆" }); },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) =>
      toast({ variant: "destructive", title: "Couldn't select winner", description: e?.response?.data?.error?.message ?? "Try again." }),
  });

  return (
    <div className="border border-border rounded-sm p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold">{s.influencer?.name ?? "Creator"}</p>
          {s.instagramUsername && <p className="text-[11px] text-muted-foreground">@{s.instagramUsername}</p>}
        </div>
        <StatusPill status={s.status} />
      </div>

      <a href={s.reelUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-primary hover:underline inline-flex items-center gap-1">
        View Reel <ExternalLink className="h-3 w-3" />
      </a>

      <p className="text-[11px] text-muted-foreground">Submitted {new Date(s.createdAt).toLocaleDateString()}</p>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
        <Button
          size="sm" variant="outline" className="h-8 text-[12px] rounded-sm"
          disabled={s.status !== "SUBMITTED" || markUnderReview.isPending}
          onClick={() => markUnderReview.mutate()}
        >
          {markUnderReview.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark Under Review"}
        </Button>

        <Input
          type="number" min={0} value={views} onChange={(e) => setViews(e.target.value)}
          placeholder="Verified views" className="h-8 w-32 text-[12px] rounded-sm"
        />
        <Button
          size="sm" variant="outline" className="h-8 text-[12px] rounded-sm"
          disabled={views === "" || s.status === "WINNER" || setVerifiedViews.isPending}
          onClick={() => setVerifiedViews.mutate()}
        >
          {setVerifiedViews.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Views"}
        </Button>

        <ConfirmDialog
          title="Select this creator as the winner?"
          description={`This records a ₹1,000 reward and permanently closes the campaign to further winners. "${s.influencer?.name ?? "This creator"}" must already be Eligible.`}
          confirmLabel="Confirm Winner"
          onConfirm={() => markWinner.mutate()}
          trigger={
            <Button size="sm" disabled={s.status !== "ELIGIBLE" || markWinner.isPending} className="h-8 text-[12px] rounded-sm bg-gradient-brand text-primary-foreground border-0 gap-1">
              {markWinner.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Trophy className="h-3.5 w-3.5" /> Mark Winner</>}
            </Button>
          }
        />
      </div>
    </div>
  );
}

export default function AdminReferrals() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "referrals"],
    queryFn: () => referralsService.adminList(),
  });

  const submissions = data?.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to="/dashboard/influencer"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Referral Submissions</h1>
          <p className="text-[13px] text-muted-foreground mt-1">{submissions.length} submission{submissions.length === 1 ? "" : "s"}.</p>
        </div>

        {isLoading ? (
          <div className="border border-border rounded-sm p-10 text-center text-[13px] text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading submissions…
          </div>
        ) : submissions.length === 0 ? (
          <div className="border border-border rounded-sm p-10 text-center text-[13px] text-muted-foreground">No submissions yet.</div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => <SubmissionRow key={s.id} s={s} />)}
          </div>
        )}
      </main>
    </div>
  );
}
