import { ArrowRight, ExternalLink, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { isInstagramUrl } from "@/lib/instagramUrl";
import { REFERRAL_VIEW_THRESHOLD, REFERRAL_REWARD_AMOUNT } from "@/lib/referrals";
import { referralsService } from "@/services/referrals";
import type { ReferralStatus } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: ReferralStatus }) {
  const cls =
    status === "ELIGIBLE" || status === "WINNER"
      ? "text-success"
      : status === "NOT_ELIGIBLE"
        ? "text-destructive"
        : "text-warning";
  const label = status === "UNDER_REVIEW" ? "Under Review" : status === "NOT_ELIGIBLE" ? "Not Eligible" : status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${cls}`}>{label}</span>;
}

export default function ReferralPage() {
  const [reelUrl, setReelUrl] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["referrals", "mine"],
    queryFn: referralsService.mine,
  });

  const submit = useMutation({
    mutationFn: () => referralsService.submit(reelUrl, instagramUsername.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["referrals", "mine"] });
      toast({ title: "Your Reel has been submitted successfully." });
      setReelUrl("");
      setInstagramUsername("");
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) =>
      toast({
        variant: "destructive",
        title: "Couldn't submit your Reel",
        description: err?.response?.data?.error?.message ?? "Please enter a valid Instagram Reel URL.",
      }),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
        <div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 mb-3">
            <Gift className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Create. Share. Win ₹{REFERRAL_REWARD_AMOUNT.toLocaleString()}.</h1>
          <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
            Create a Reel promoting You Collab, post it on Instagram, and submit the Reel to participate.
          </p>
          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
            If your Reel crosses {REFERRAL_VIEW_THRESHOLD.toLocaleString()} views, you'll be eligible for a chance to win ₹{REFERRAL_REWARD_AMOUNT.toLocaleString()}.
          </p>
          <ul className="text-[12px] text-muted-foreground mt-3 space-y-1 list-disc list-inside">
            <li>Views are verified manually by the YouCollab team before eligibility is granted.</li>
            <li>Crossing the view threshold makes you eligible for the draw — it isn't a guaranteed payout.</li>
            <li>One winner is selected from all eligible entries at the end of the campaign.</li>
            <li>Each Reel can only be submitted once.</li>
          </ul>
        </div>

        <div className="border border-border rounded-sm p-6 bg-background space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Submit Your Reel</h3>
          <div className="space-y-1">
            <Label htmlFor="reelUrl" className="text-[12px]">Reel Link</Label>
            <Input
              id="reelUrl"
              value={reelUrl}
              onChange={(e) => setReelUrl(e.target.value)}
              placeholder="Paste your Instagram Reel link"
              className="h-9 text-[13px] rounded-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="igUsername" className="text-[12px]">Instagram Username <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="igUsername"
              value={instagramUsername}
              onChange={(e) => setInstagramUsername(e.target.value)}
              placeholder="@yourusername"
              className="h-9 text-[13px] rounded-sm"
            />
          </div>
          <Button
            onClick={() => submit.mutate()}
            disabled={!isInstagramUrl(reelUrl) || submit.isPending}
            className="w-full h-9 rounded-sm bg-gradient-brand text-primary-foreground border-0 text-[13px] gap-1.5"
          >
            {submit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Submit Your Reel <ArrowRight className="h-3.5 w-3.5" /></>}
          </Button>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Submissions</h3>
          {isLoading ? (
            <div className="border border-border rounded-sm p-6 text-center text-[13px] text-muted-foreground">Loading…</div>
          ) : submissions.length === 0 ? (
            <div className="border border-border rounded-sm p-6 text-center text-[13px] text-muted-foreground">No submissions yet.</div>
          ) : (
            <div className="space-y-2">
              {submissions.map((s) => (
                <div key={s.id} className="border border-border rounded-sm p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={s.status} />
                    <a href={s.reelUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-primary hover:underline inline-flex items-center gap-1">
                      View Reel <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {s.instagramUsername && <p className="text-[12px] text-muted-foreground">@{s.instagramUsername}</p>}
                  <p className="text-[11px] text-muted-foreground">Submitted {new Date(s.createdAt).toLocaleDateString()}</p>
                  {s.verifiedViews != null && (
                    <p className="text-[11px] text-muted-foreground">Verified views: {s.verifiedViews.toLocaleString()}</p>
                  )}
                  {s.status === "WINNER" && s.rewardAmount != null && (
                    <p className="text-[12px] font-semibold text-success">You won ₹{s.rewardAmount.toLocaleString()}! 🏆</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
