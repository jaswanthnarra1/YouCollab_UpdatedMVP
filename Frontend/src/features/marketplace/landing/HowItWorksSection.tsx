import { useRef, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import { UserPlus, Building2, Megaphone, Inbox, Handshake, TrendingUp, ListChecks } from "lucide-react";
import { HOW_IT_WORKS_STEPS, type StepIconKey } from "./howItWorksData";

const STEP_ICONS: Record<StepIconKey, ReactNode> = {
  userPlus: <UserPlus className="h-4 w-4" aria-hidden="true" />,
  building: <Building2 className="h-4 w-4" aria-hidden="true" />,
  megaphone: <Megaphone className="h-4 w-4" aria-hidden="true" />,
  inbox: <Inbox className="h-4 w-4" aria-hidden="true" />,
  handshake: <Handshake className="h-4 w-4" aria-hidden="true" />,
  trendingUp: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
};

export function HowItWorksSection() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section className="relative py-28 px-6 overflow-hidden bg-white dark:bg-[#16151D]" id="how-it-works">
      <div className="mx-auto max-w-[720px] relative z-10">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-14 text-center"
        >
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#5B8CFF] font-semibold mb-4">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" /> How It Works
          </p>
          <h2
            className="font-semibold tracking-[-0.03em] leading-[1.15] text-slate-900 dark:text-white mx-auto"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
          >
            From sign-up to shipped collab.
          </h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200 dark:bg-white/[0.08]" aria-hidden="true" />
          <ol className="space-y-8">
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <StepRow key={step.title} step={step} index={i} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function StepRow({ step, index }: { step: (typeof HOW_IT_WORKS_STEPS)[number]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.li
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      className="relative flex items-start gap-5"
    >
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#2353E9]/30 bg-white dark:bg-[#0F1115] text-[#5B8CFF]">
        {STEP_ICONS[step.icon]}
      </div>
      <div className="pt-1.5">
        <h3 className="text-[15px] font-semibold text-slate-800 dark:text-white/90">{step.title}</h3>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-white/45 leading-relaxed">{step.description}</p>
      </div>
    </motion.li>
  );
}
