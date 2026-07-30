import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/common/accordion";
import { authService } from "@/services/auth";
import { Button } from "@/components/common/button";
import { Checkbox } from "@/components/common/checkbox";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/common/label";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Navigate, useNavigate } from "react-router-dom";
import {
  DOCUMENT_TITLE,
  GOVERNING_LINE,
  LEGAL_NOTICE,
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  TERMS_VERSION,
  type TermsDocument,
} from "./termsContent";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * ponytail: each section is shown in full inside a scrollable pane (smooth
 * native scrolling) rather than a separate truncate/expand toggle per
 * section — the outer accordion already is the expand/collapse control, and
 * legal text is exactly the content you don't want silently clipped by
 * default. Upgrade path if a literal per-section "Read more" is ever
 * required: wrap each <DocumentSections> in a max-height clamp + fade with
 * its own toggle state.
 */
function DocumentSections({ doc }: { doc: TermsDocument }) {
  return (
    <div className="max-h-[420px] overflow-y-auto scroll-smooth pr-3 space-y-5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{doc.meta}</p>
      {doc.sections.map((section) => (
        <div key={section.number} className="space-y-1.5">
          <h4 className="text-[13px] font-semibold text-foreground">
            {section.number}. {section.heading}
          </h4>
          <div className="space-y-1.5">
            {section.clauses.map((c, i) => (
              <p key={i} className="text-[12.5px] leading-relaxed text-muted-foreground whitespace-pre-line">
                {c.lead && <span className="font-semibold text-foreground">{c.lead}: </span>}
                {c.text}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AcceptTermsPage() {
  const [agreed, setAgreed] = useState(false);
  const { user, hydrated, setUser } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const accept = useMutation({
    mutationFn: () => authService.acceptTerms(TERMS_VERSION),
    onSuccess: ({ user: fresh }) => {
      setUser(fresh);
      toast({ title: "Thanks — you're all set." });
      const dest = !fresh.isOnboarded
        ? fresh.role === "BRAND" ? "/onboarding/brand" : "/onboarding/influencer"
        : fresh.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";
      navigate(dest, { replace: true });
    },
    onError: (err: any) =>
      toast({
        variant: "destructive",
        title: "Couldn't record your acceptance",
        description: err?.response?.data?.error?.message ?? "Try again.",
      }),
  });

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  // Already compliant (or navigated here manually) — nothing to do here.
  if (!user.needsTermsAcceptance) {
    const dest = !user.isOnboarded
      ? user.role === "BRAND" ? "/onboarding/brand" : "/onboarding/influencer"
      : user.role === "BRAND" ? "/dashboard/brand" : "/dashboard/influencer";
    return <Navigate to={dest} replace />;
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-[760px] px-6 py-10 print:max-w-none">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-border rounded-sm bg-background p-8 space-y-6"
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Welcome to YouCollab</h1>
              <p className="text-[13px] text-muted-foreground mt-2 max-w-md mx-auto">
                Before you start collaborating with brands and creators, please review and accept our Terms of
                Service and Privacy Policy.
              </p>
            </div>
          </div>

          <div className="border border-border rounded-sm p-4 bg-muted/40 space-y-1">
            <p className="text-[11px] font-semibold text-foreground">{DOCUMENT_TITLE}</p>
            <p className="text-[10px] text-muted-foreground">{GOVERNING_LINE}</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground pt-1">{LEGAL_NOTICE}</p>
          </div>

          <Accordion type="multiple" className="border border-border rounded-sm px-4">
            <AccordionItem value="terms">
              <AccordionTrigger className="text-[13px] font-semibold hover:no-underline">
                📜 Terms of Service
              </AccordionTrigger>
              <AccordionContent>
                <DocumentSections doc={TERMS_OF_SERVICE} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="privacy" className="border-b-0">
              <AccordionTrigger className="text-[13px] font-semibold hover:no-underline">
                🔒 Privacy Policy
              </AccordionTrigger>
              <AccordionContent>
                <DocumentSections doc={PRIVACY_POLICY} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex items-start gap-2.5 pt-1 print:hidden">
            <Checkbox
              id="agree-terms"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="agree-terms" className="text-[12.5px] font-normal leading-relaxed cursor-pointer">
              I have read and agree to the Terms of Service and Privacy Policy.
            </Label>
          </div>

          <div className="flex justify-end pt-1 print:hidden">
            <Button
              disabled={!agreed || accept.isPending}
              onClick={() => accept.mutate()}
              className="h-9 text-[13px] rounded-sm gap-1.5 bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95"
            >
              {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept & Continue"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
