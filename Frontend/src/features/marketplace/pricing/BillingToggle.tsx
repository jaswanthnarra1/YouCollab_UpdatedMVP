import { motion } from "framer-motion";

export type BillingPeriod = "monthly" | "yearly";

interface BillingToggleProps {
  value: BillingPeriod;
  onChange: (value: BillingPeriod) => void;
}

const OPTIONS: { value: BillingPeriod; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function BillingToggle({ value, onChange }: BillingToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Billing period"
      className="relative inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] p-1"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 px-5 py-2 rounded-full text-[13px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B8CFF]/60 ${
              active ? "text-white" : "text-slate-500 hover:text-slate-700 dark:text-white/45 dark:hover:text-white/70"
            }`}
          >
            {active && (
              <motion.span
                layoutId="billing-toggle-pill"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="absolute inset-0 -z-10 rounded-full bg-[#2353E9] shadow-lg shadow-blue-500/25"
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
