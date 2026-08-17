import { Button } from "@/components/common/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/common/dialog";
import { CheckCircle2, Loader2, Rocket, Sparkles, TrendingUp, ArrowLeft } from "lucide-react";
import { PLAN_META } from "@/features/marketplace/pricing/pricingData";
import { plansService } from "@/services/plans";
import type { Plan, PlanUsage } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

// Same icon-per-plan mapping as the homepage pricing section — visual
// consistency, not a duplicated data source (the numbers still come from
// plansService.list(), i.e. GET /api/plans).
const PLAN_ICONS: Record<string, ReactNode> = {
  FREE: <Sparkles className="h-4 w-4" aria-hidden="true" />,
  STARTER: <Rocket className="h-4 w-4" aria-hidden="true" />,
  GROWTH: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
};

const PLAN_ORDER = ["FREE", "STARTER", "GROWTH"];
const rank = (name: string) => PLAN_ORDER.indexOf(name);
const priceLabel = (price: number) => (price === 0 ? "₹0" : `₹${price}`);

function PlanCard({
  plan, isCurrent, currentRank, isPending, pendingIsThisPlan, onSelect,
}: {
  plan: Plan;
  isCurrent: boolean;
  /** Rank of the brand's actual current plan (0=Free, 1=Starter, 2=Growth) — decides Upgrade vs Request wording below. */
  currentRank: number;
  isPending: boolean;
  pendingIsThisPlan: boolean;
  onSelect: (plan: Plan) => void;
}) {
  const meta = PLAN_META[plan.name];
  const isUpgrade = rank(plan.name) > currentRank;

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-5 border transition-colors ${
        isCurrent
          ? "border-primary/50 bg-primary/[0.04]"
          : "border-border bg-background hover:border-primary/30"
      }`}
    >
      {isCurrent && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
          Current Plan
        </span>
      )}

      <div className="flex items-center gap-2 text-primary">
        {PLAN_ICONS[plan.name]}
        <h3 className="text-[14px] font-semibold tracking-tight text-foreground">
          {plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}
        </h3>
      </div>

      {meta && <p className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed">{meta.description}</p>}

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-black tracking-tight tabular-nums text-foreground">{priceLabel(plan.price)}</span>
        {plan.price > 0 && <span className="text-[12px] font-medium text-muted-foreground">/month</span>}
      </div>

      <ul className="mt-4 space-y-2 flex-1 text-[12.5px]">
        <li className="flex items-start gap-2 text-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <span><strong className="font-semibold">{plan.campaignLimit}</strong> Campaign Credits</span>
        </li>
        <li className="flex items-start gap-2 text-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <span><strong className="font-semibold">{plan.applicationSlotLimit}</strong> Application Slots</span>
        </li>
        {meta && (
          <li className="flex items-start gap-2 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <span>{meta.extraFeature}</span>
          </li>
        )}
      </ul>

      <div className="mt-5">
        {isCurrent ? (
          <Button disabled variant="outline" className="w-full h-9 text-[12.5px] rounded-full cursor-default opacity-70">
            Current Plan
          </Button>
        ) : pendingIsThisPlan ? (
          <Button disabled variant="outline" className="w-full h-9 text-[12.5px] rounded-full">
            Request Pending
          </Button>
        ) : (
          <Button
            onClick={() => onSelect(plan)}
            disabled={isPending}
            className="w-full h-9 text-[12.5px] rounded-full bg-gradient-brand text-primary-foreground border-0"
          >
            {isUpgrade ? `Upgrade to ${plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}` : "Request Plan Change"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function PlanUpgradeDialog() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const { data: plans = [] } = useQuery({ queryKey: ["public-plans"], queryFn: plansService.list });
  // Shares the ["plans","usage"] cache with the dashboard's own header
  // panel — fetched once regardless of which one mounts first, and not
  // gated on `open` so the trigger button's own label (below) can already
  // reflect a pending request before the dialog is even opened.
  const { data: planUsage } = useQuery<PlanUsage>({ queryKey: ["plans", "usage"], queryFn: plansService.usage });

  const submit = useMutation({
    mutationFn: (planName: "FREE" | "STARTER" | "GROWTH") => plansService.request(planName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans", "usage"] });
      setJustSubmitted(true);
    },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) =>
      toast({
        variant: "destructive",
        title: "Couldn't submit request",
        description: e?.response?.data?.error?.message ?? "Try again.",
      }),
  });

  const resetAndClose = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Let the close animation finish before wiping the confirm step.
      setTimeout(() => { setSelected(null); setJustSubmitted(false); }, 200);
    }
  };

  const currentPlanName = planUsage?.plan.name;
  const pendingRequest = planUsage?.latestRequest?.status === "PENDING" ? planUsage.latestRequest : null;
  const pendingRequestedPlan = pendingRequest ? plans.find((p) => p.id === pendingRequest.requestedPlanId) : null;
  const resolvedPlanName = planUsage?.latestRequest && planUsage.latestRequest.status !== "PENDING"
    ? plans.find((p) => p.id === planUsage.latestRequest!.requestedPlanId)?.name
    : null;
  const isOnHighestPlan = currentPlanName === "GROWTH";

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogTrigger asChild>
        <button type="button" className={`text-[11px] hover:underline ${pendingRequest ? "text-warning" : "text-primary"}`}>
          {pendingRequest ? `Request pending (${pendingRequestedPlan?.name ?? "…"})` : "Request Plan Change"}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
        {selected ? (
          // --- Confirmation step ---------------------------------------
          <>
            <DialogHeader>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground mb-1 w-fit"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to plans
              </button>
              <DialogTitle className="text-xl">
                {justSubmitted ? "Upgrade request submitted" : `Request ${selected.name.charAt(0) + selected.name.slice(1).toLowerCase()} Plan`}
              </DialogTitle>
              <DialogDescription>
                {justSubmitted
                  ? "Our team will review your request and update your plan manually."
                  : "No payment is taken now — this just sends your request to the YouCollab team."}
              </DialogDescription>
            </DialogHeader>

            {!justSubmitted && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-[13px] space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current plan</span>
                  <span className="font-medium text-foreground">{currentPlanName ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested plan</span>
                  <span className="font-semibold text-primary">{selected.name}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2.5">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium text-foreground">{priceLabel(selected.price)}{selected.price > 0 ? "/month" : ""}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campaign Credits</span>
                  <span className="font-medium text-foreground">{selected.campaignLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Application Slots</span>
                  <span className="font-medium text-foreground">{selected.applicationSlotLimit}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              {justSubmitted ? (
                <Button onClick={() => resetAndClose(false)} className="rounded-full">Done</Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setSelected(null)} className="rounded-full">Cancel</Button>
                  <Button
                    onClick={() => submit.mutate(selected.name as "FREE" | "STARTER" | "GROWTH")}
                    disabled={submit.isPending}
                    className="rounded-full bg-gradient-brand text-primary-foreground border-0"
                  >
                    {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Upgrade Request"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        ) : (
          // --- Plan picker ------------------------------------------------
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Choose your You Collab plan</DialogTitle>
              <DialogDescription>Upgrade your campaign capacity and application reach.</DialogDescription>
            </DialogHeader>

            {pendingRequest ? (
              <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-3.5 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      Current Plan <span className="font-semibold text-foreground">{currentPlanName}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Requested Plan <span className="font-semibold text-foreground">{pendingRequestedPlan?.name ?? "—"}</span>
                    </span>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-warning/15 text-warning px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Pending
                  </span>
                </div>
              </div>
            ) : planUsage?.latestRequest && planUsage.latestRequest.status !== "PENDING" ? (
              // A resolved request (approved or rejected) doesn't block a new
              // one, but it's still worth a quiet note rather than vanishing
              // with no record at all.
              <p className="text-[12px] text-muted-foreground">
                Your last request ({resolvedPlanName ?? "—"}) was{" "}
                <span className={planUsage.latestRequest.status === "APPROVED" ? "text-success font-medium" : "text-destructive font-medium"}>
                  {planUsage.latestRequest.status === "APPROVED" ? "approved" : "rejected"}
                </span>.
              </p>
            ) : null}

            {isOnHighestPlan && !pendingRequest && (
              <p className="text-[13px] text-muted-foreground">You're on the highest plan.</p>
            )}

            <div className="grid sm:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={plan.name === currentPlanName}
                  currentRank={rank(currentPlanName ?? "FREE")}
                  isPending={submit.isPending}
                  pendingIsThisPlan={!!pendingRequest && pendingRequestedPlan?.id === plan.id}
                  onSelect={setSelected}
                />
              ))}
            </div>

            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium px-3 py-2"></th>
                    {plans.map((p) => (
                      <th key={p.id} className="text-right font-medium px-3 py-2">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/60">
                    <td className="px-3 py-2 text-muted-foreground">Price</td>
                    {plans.map((p) => (
                      <td key={p.id} className="text-right px-3 py-2 font-medium text-foreground tabular-nums">
                        {priceLabel(p.price)}{p.price > 0 ? "/mo" : ""}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="px-3 py-2 text-muted-foreground">Campaign Credits</td>
                    {plans.map((p) => (
                      <td key={p.id} className="text-right px-3 py-2 font-medium text-foreground tabular-nums">{p.campaignLimit}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-muted-foreground">Application Slots</td>
                    {plans.map((p) => (
                      <td key={p.id} className="text-right px-3 py-2 font-medium text-foreground tabular-nums">{p.applicationSlotLimit}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
