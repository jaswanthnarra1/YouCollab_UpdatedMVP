import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/common/button";
import { Link } from "react-router-dom";
import { adminService } from "@/services/admin";
import { plansService } from "@/services/plans";
import type { PlanChangeRequest } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function StatusPill({ status }: { status: PlanChangeRequest["status"] }) {
  const cls = status === "APPROVED" ? "text-success" : status === "REJECTED" ? "text-destructive" : "text-warning";
  return <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${cls}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

/**
 * Brand -> Admin plan-change request queue (see plan.routes.js POST
 * /request and admin.routes.js /plan-requests). Approving reuses the
 * existing admin_adjust_brand_plan path via adminApprovePlanChangeRequest —
 * this page never writes to a brand's plan/credits/slots directly.
 */
function RequestRow({ r, planNameById }: { r: PlanChangeRequest; planNameById: Map<string, string> }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "plan-requests"] });

  const approve = useMutation({
    mutationFn: () => adminService.approvePlanRequest(r.id),
    onSuccess: () => { invalidate(); toast({ title: "Request approved — plan updated" }); },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) =>
      toast({ variant: "destructive", title: "Approve failed", description: e?.response?.data?.error?.message ?? "Try again." }),
  });

  const reject = useMutation({
    mutationFn: () => adminService.rejectPlanRequest(r.id),
    onSuccess: () => { invalidate(); toast({ title: "Request rejected" }); },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) =>
      toast({ variant: "destructive", title: "Reject failed", description: e?.response?.data?.error?.message ?? "Try again." }),
  });

  const isPending = r.status === "PENDING";

  return (
    <div className="border border-border rounded-sm p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">{r.brand?.businessName ?? "Brand"}</p>
        <StatusPill status={r.status} />
      </div>

      <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
        <span>Current <span className="font-medium text-foreground">{planNameById.get(r.currentPlanId ?? "") ?? "—"}</span></span>
        <span>Requested <span className="font-medium text-foreground">{planNameById.get(r.requestedPlanId) ?? "—"}</span></span>
        <span>{new Date(r.createdAt).toLocaleString()}</span>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          <Button
            size="sm" disabled={approve.isPending || reject.isPending} onClick={() => approve.mutate()}
            className="h-8 text-[12px] rounded-sm bg-gradient-brand text-primary-foreground border-0 gap-1"
          >
            {approve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5" /> Approve</>}
          </Button>
          <Button
            size="sm" variant="outline" disabled={approve.isPending || reject.isPending} onClick={() => reject.mutate()}
            className="h-8 text-[12px] rounded-sm gap-1"
          >
            {reject.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><X className="h-3.5 w-3.5" /> Reject</>}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminPlanRequests() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin", "plan-requests"],
    queryFn: () => adminService.listPlanRequests(),
  });
  const { data: plans = [] } = useQuery({ queryKey: ["public-plans"], queryFn: plansService.list });
  const planNameById = new Map(plans.map((p) => [p.id, p.name]));

  const pending = requests.filter((r) => r.status === "PENDING");
  const resolved = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to="/dashboard/brand"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plan Change Requests</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {pending.length} pending. Approving applies the plan change immediately; nothing is charged.
          </p>
        </div>

        {isLoading ? (
          <div className="border border-border rounded-sm p-10 text-center text-[13px] text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="border border-border rounded-sm p-10 text-center text-[13px] text-muted-foreground">No plan change requests yet.</div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-3">
                {pending.map((r) => <RequestRow key={r.id} r={r} planNameById={planNameById} />)}
              </div>
            )}
            {resolved.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-[12px] uppercase tracking-wider text-muted-foreground pt-2">Reviewed</h2>
                {resolved.map((r) => <RequestRow key={r.id} r={r} planNameById={planNameById} />)}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
