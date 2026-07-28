import { CheckCircle2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export interface PricingCardProps {
  name: string;
  icon: ReactNode;
  priceLabel: string;
  periodLabel: string;
  /** Changing this key re-triggers the price fade/slide animation (e.g. on billing-period switch). */
  priceKey: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaTo: string;
  highlighted?: boolean;
  badge?: string;
  saveLabel?: string;
  delay?: number;
}

export function PricingCard({
  name,
  icon,
  priceLabel,
  periodLabel,
  priceKey,
  description,
  features,
  ctaLabel,
  ctaTo,
  highlighted,
  badge,
  saveLabel,
  delay = 0,
}: PricingCardProps) {
  return (
    <motion.div
      role="listitem"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{ y: -6 }}
      className={`relative flex flex-col rounded-[24px] p-6 sm:p-7 transition-colors duration-300 ${
        highlighted
          ? "border border-[#2353E9]/50 bg-gradient-to-b from-[#1B2B6B] to-[#0F1330] shadow-[0_20px_60px_rgba(35,83,233,0.3)] md:scale-[1.03]"
          : "border border-white/[0.06] bg-white/[0.02] shadow-[0_12px_40px_rgba(0,0,0,0.25)] hover:border-[#2353E9]/30"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[#2353E9] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-500/30">
          <Sparkles className="h-3 w-3" aria-hidden="true" /> {badge}
        </span>
      )}

      <div className="mb-2 flex items-center gap-2" style={{ color: highlighted ? "#9db4ff" : "#5B8CFF" }}>
        {icon}
        <h3 className="text-[15px] font-semibold tracking-tight text-white">{name}</h3>
      </div>

      <p className={`text-[13px] leading-relaxed ${highlighted ? "text-white/60" : "text-white/45"}`}>{description}</p>

      <div className="mt-6 flex items-baseline gap-1.5 min-h-[2.75rem]">
        <AnimatePresence mode="wait">
          <motion.span
            key={priceKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="text-4xl font-black tracking-tight text-white tabular-nums"
          >
            {priceLabel}
          </motion.span>
        </AnimatePresence>
        <span className={`text-[13px] font-medium ${highlighted ? "text-white/50" : "text-white/35"}`}>
          {periodLabel}
        </span>
        {saveLabel && (
          <motion.span
            key={`save-${priceKey}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`ml-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              highlighted ? "bg-white/15 text-white" : "bg-[#5B8CFF]/15 text-[#88a3ff]"
            }`}
          >
            {saveLabel}
          </motion.span>
        )}
      </div>

      <ul className="mt-6 space-y-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px] text-white/70">
            <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${highlighted ? "text-white" : "text-[#5B8CFF]"}`} aria-hidden="true" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link to={ctaTo} className="mt-8 block" aria-label={`${ctaLabel} — ${name} plan`}>
        <button
          type="button"
          className={`group w-full rounded-full px-5 py-3 font-semibold text-[13px] transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B8CFF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D13] ${
            highlighted
              ? "bg-white text-[#2353E9] shadow-xl shadow-black/[0.15] hover:shadow-2xl hover:scale-[1.02]"
              : "bg-[#2353E9] text-white shadow-md shadow-blue-500/20 hover:bg-[#1d47cc] hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02]"
          }`}
        >
          {ctaLabel}
        </button>
      </Link>
    </motion.div>
  );
}
