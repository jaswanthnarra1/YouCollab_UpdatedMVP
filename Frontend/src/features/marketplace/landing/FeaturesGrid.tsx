import { useRef, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import { Shield, MapPin, MessageCircle, Gauge, Bell, Settings2, Sparkles } from "lucide-react";
import { FEATURES, type FeatureIconKey } from "./featuresData";

const FEATURE_ICONS: Record<FeatureIconKey, ReactNode> = {
  shield: <Shield className="h-7 w-7" style={{ color: "#5B8CFF" }} strokeWidth={2.25} />,
  mapPin: <MapPin className="h-7 w-7" style={{ color: "#5B8CFF" }} strokeWidth={2.25} />,
  messageCircle: <MessageCircle className="h-7 w-7" style={{ color: "#5B8CFF" }} strokeWidth={2.25} />,
  gauge: <Gauge className="h-7 w-7" style={{ color: "#5B8CFF" }} strokeWidth={2.25} />,
  bell: <Bell className="h-7 w-7" style={{ color: "#5B8CFF" }} strokeWidth={2.25} />,
  settings: <Settings2 className="h-7 w-7" style={{ color: "#5B8CFF" }} strokeWidth={2.25} />,
};

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  desc: string;
  delay: number;
}

function FeatureCard({ icon, title, desc, delay }: FeatureCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className="group relative rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-8 transition-colors duration-300 hover:border-[#2353E9]/30"
    >
      <div className="mb-7 w-fit transition-all duration-300 ease-out group-hover:scale-[1.05] group-hover:-translate-y-1">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold tracking-tight mb-2 text-slate-900 dark:text-white/90">{title}</h3>
      <p className="text-[13px] text-slate-500 dark:text-white/45 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

export function FeaturesGrid() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section className="relative py-28 px-6 overflow-hidden bg-slate-50 dark:bg-[#0F1115]" id="features">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute rounded-full"
          style={{
            top: "-20%", left: "-10%",
            width: "50%", height: "60%",
            background: "radial-gradient(ellipse, rgba(91,140,255,0.04) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: "-15%", right: "-5%",
            width: "40%", height: "50%",
            background: "radial-gradient(ellipse, rgba(91,140,255,0.03) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      <div className="mx-auto max-w-[1100px] relative z-10">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-16"
        >
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#5B8CFF] font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Why You Collab
          </p>
          <h2
            className="font-semibold tracking-[-0.03em] max-w-[500px] leading-[1.15] text-slate-900 dark:text-white"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
          >
            Less DMs.
            <br />
            More deals.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => (
            <FeatureCard
              key={feature.title}
              icon={FEATURE_ICONS[feature.icon]}
              title={feature.title}
              desc={feature.description}
              delay={i * 0.08}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
