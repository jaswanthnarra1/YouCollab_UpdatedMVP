import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { Link } from "react-router-dom";
import { adminService, type AdminBrand } from "@/services/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * V1 manual plan management (PRD section 28) — the only place a brand's
 * plan, Campaign Credits, or Application Slots can change, since there's
 * no self-service upgrade endpoint anymore (see admin.routes.js
 * PATCH /brands/:brandId/plan, requireAdmin-gated).
 */
function BrandRow({ b }: { b: AdminBrand }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [planName, setPlanName] = useState<string>(b.plan?.name ?? "FREE");
  const [credits, setCredits] = useState(String(b.campaignCreditsRemaining));
  const [slots, setSlots] = useState(String(b.applicationSlotsRemaining));

  const update = useMutation({
    mutationFn: () =>
      adminService.updateBrandPlan(b.id, {
        planName: planName as "FREE" | "STARTER" | "GROWTH",
        campaignCredits: credits === "" ? undefined : Number(credits),
        applicationSlots: slots === "" ? undefined : Number(slots),
        reason: "Manual admin adjustment",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "brands"] });
      toast({ title: `${b.businessName} updated` });
    },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) =>
      toast({ variant: "destructive", title: "Update failed", description: e?.response?.data?.error?.message ?? "Try again." }),
  });

  return (
    <div className="border border-border rounded-sm p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">{b.businessName}</p>
        <p className="text-[11px] text-muted-foreground">
          Cycle ends {b.billingCycleEnd ? new Date(b.billingCycleEnd).toLocaleDateString() : "—"}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Plan</label>
          <Select value={planName} onValueChange={setPlanName}>
            <SelectTrigger className="h-8 text-[12px] rounded-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FREE">Free</SelectItem>
              <SelectItem value="STARTER">Starter</SelectItem>
              <SelectItem value="GROWTH">Growth</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Campaign Credits</label>
          <Input type="number" min={0} value={credits} onChange={(e) => setCredits(e.target.value)} className="h-8 text-[12px] rounded-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Application Slots</label>
          <Input type="number" min={0} value={slots} onChange={(e) => setSlots(e.target.value)} className="h-8 text-[12px] rounded-sm" />
        </div>
      </div>

      <Button
        size="sm"
        disabled={update.isPending}
        onClick={() => update.mutate()}
        className="h-8 text-[12px] rounded-sm bg-gradient-brand text-primary-foreground border-0"
      >
        {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
      </Button>
    </div>
  );
}

export default function AdminBrandPlans() {
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: adminService.listBrands,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to="/dashboard/brand"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brand Plans</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Manual V1 plan management — no self-service billing exists yet, so plan/credit/slot changes happen here.
          </p>
        </div>

        {isLoading ? (
          <div className="border border-border rounded-sm p-10 text-center text-[13px] text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading brands…
          </div>
        ) : brands.length === 0 ? (
          <div className="border border-border rounded-sm p-10 text-center text-[13px] text-muted-foreground">No brands yet.</div>
        ) : (
          <div className="space-y-3">
            {brands.map((b) => <BrandRow key={b.id} b={b} />)}
          </div>
        )}
      </main>
    </div>
  );
}
