import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Wallet, Sparkles, Rocket, TrendingUp, Building2 } from "lucide-react";
import { plansService } from "@/services/plans";
import type { Plan } from "@/types";
import { BillingToggle, type BillingPeriod } from "./BillingToggle";
import { PricingCard } from "./PricingCard";
import { PLAN_META, ENTERPRISE_PLAN, FALLBACK_PLANS, yearlyPrice } from "./pricingData";

const PLAN_ICONS: Record<string, ReactNode> = {
  FREE: <Sparkles className="h-4 w-4" aria-hidden="true" />,
  STARTER: <Rocket className="h-4 w-4" aria-hidden="true" />,
  GROWTH: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
};

const formatRupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function PricingSection() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  const { data: plans, isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: plansService.list,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const displayPlans: Plan[] = useMemo(
    () => (plans && plans.length > 0 ? plans : FALLBACK_PLANS),
    [plans]
  );

  return (
    <section className="relative py-28 px-6 overflow-hidden bg-white dark:bg-[#0B0D13]" id="pricing">
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: "5%",
          left: "-10%",
          width: "45%",
          height: "55%",
          background: "radial-gradient(ellipse, rgba(91,140,255,0.05) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      <div className="mx-auto max-w-[1200px] relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#5B8CFF] font-semibold mb-4">
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" /> Pricing
          </p>
          <h2
            className="font-semibold tracking-[-0.03em] leading-[1.15] text-slate-900 dark:text-white mx-auto"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
          >
            Choose Your Plan
          </h2>
          <p className="mt-4 max-w-[480px] mx-auto text-[14px] text-slate-500 dark:text-white/45 leading-relaxed">
            Choose the plan that fits your brand and start connecting with local creators.
          </p>

          <div className="mt-8 flex justify-center">
            <BillingToggle value={billing} onChange={setBilling} />
          </div>
        </motion.div>

        <div
          role="list"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch"
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[420px] rounded-[24px] border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] animate-pulse"
                />
              ))
            : displayPlans.map((plan, i) => {
                const meta = PLAN_META[plan.name];
                if (!meta) return null;
                const price = billing === "yearly" ? yearlyPrice(plan.price) : plan.price;
                const priceLabel = plan.price === 0 ? "₹0" : formatRupees(price);
                const periodLabel =
                  plan.price === 0 ? "Forever" : billing === "yearly" ? "per year" : "per month";

                return (
                  <PricingCard
                    key={plan.id}
                    name={plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}
                    icon={PLAN_ICONS[plan.name]}
                    priceLabel={priceLabel}
                    periodLabel={periodLabel}
                    priceKey={`${plan.name}-${billing}`}
                    description={meta.description}
                    features={[
                      `${plan.campaignLimit} Campaign Credits`,
                      `${plan.applicationSlotLimit} Application Slots`,
                      meta.extraFeature,
                    ]}
                    ctaLabel={meta.ctaLabel}
                    ctaTo="/register?role=BRAND"
                    highlighted={meta.highlighted}
                    badge={meta.badge}
                    saveLabel={billing === "yearly" && plan.price > 0 ? "Save 16%" : undefined}
                    delay={i * 0.1}
                  />
                );
              })}

          {!isLoading && (
            <PricingCard
              name="Enterprise"
              icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
              priceLabel="Custom"
              periodLabel="Contact Us"
              priceKey="enterprise"
              description={ENTERPRISE_PLAN.description}
              features={ENTERPRISE_PLAN.features}
              ctaLabel={ENTERPRISE_PLAN.ctaLabel}
              ctaTo="/contact"
              delay={displayPlans.length * 0.1}
            />
          )}
        </div>

        {billing === "yearly" && (
          <p className="mt-8 text-center text-[12px] text-slate-500 dark:text-white/50">
            Yearly billing saves 16% versus paying monthly.
          </p>
        )}
      </div>
    </section>
  );
}
