import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { gigsService } from "@/services/gigs";
import { CATEGORIES } from "@/lib/constants";

export default function GigEdit() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Cafe");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [budgetMin, setBudgetMin] = useState<number | "">("");
  const [budgetMax, setBudgetMax] = useState<number | "">("");
  const [deadline, setDeadline] = useState("");
  const [city, setCity] = useState("Pune");

  const { data: gig, isLoading } = useQuery({
    queryKey: ["gig", id],
    queryFn: () => gigsService.get(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (gig) {
      setTitle(gig.title || "");
      setCategory(gig.category || "Cafe");
      setDescription(gig.description || "");
      setDeliverables(gig.deliverables || "");
      setBudgetMin(gig.budgetMin ?? "");
      setBudgetMax(gig.budgetMax ?? "");
      if (gig.deadline) {
        // format ISO date string to YYYY-MM-DD
        setDeadline(new Date(gig.deadline).toISOString().split("T")[0]);
      }
      setCity(gig.city || "Pune");
    }
  }, [gig]);

  const update = useMutation({
    mutationFn: () => gigsService.update(id, {
      title, description, deliverables, category, city, deadline,
      budgetMin: Number(budgetMin || 0),
      budgetMax: Number(budgetMax || 0),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gigs"] });
      qc.invalidateQueries({ queryKey: ["gig", id] });
      toast({ title: "Brief updated successfully! ✨" });
      navigate("/dashboard/brand");
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast({ variant: "destructive", title: "Couldn't update brief", description: e?.response?.data?.message ?? "Try again." }),
  });

  const valid = title && description && deliverables && Number(budgetMin) >= 0 && Number(budgetMax) >= Number(budgetMin) && deadline && city;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 neon-grid pointer-events-none" />
      <main className="relative mx-auto max-w-2xl px-4 pt-8 pb-20">
        <div className="mb-4">
          <Button onClick={() => navigate("/dashboard/brand")} variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="chip mb-3"><Sparkles className="h-3 w-3 text-primary" /> Edit brief</div>
          <h1 className="text-3xl font-semibold">Edit your gig</h1>
          <p className="text-sm text-muted-foreground mt-1">Update parameters for creators in Pune.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-strong rounded-3xl p-6 space-y-5">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reel collab for new espresso launch" className="glass" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="glass" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="What's the goal of this campaign?" className="glass" />
          </div>

          <div className="space-y-1.5">
            <Label>Deliverables</Label>
            <Textarea value={deliverables} onChange={(e) => setDeliverables(e.target.value)} rows={3} placeholder="e.g. 1 reel + 3 stories within 7 days" className="glass" />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Budget min (₹)</Label>
              <Input type="number" min={0} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value === "" ? "" : Number(e.target.value))} className="glass" />
            </div>
            <div className="space-y-1.5">
              <Label>Budget max (₹)</Label>
              <Input type="number" min={0} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value === "" ? "" : Number(e.target.value))} className="glass" />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="glass" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button disabled={!valid || update.isPending} onClick={() => update.mutate()} className="bg-gradient-brand text-primary-foreground border-0">
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
