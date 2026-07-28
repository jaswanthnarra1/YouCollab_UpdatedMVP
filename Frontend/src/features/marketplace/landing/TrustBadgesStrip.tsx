import { Shield, MessageCircle, IndianRupee, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const BADGES = [
  { icon: Shield, label: "Verified Instagram Profiles" },
  { icon: MessageCircle, label: "Secure In-App Messaging" },
  { icon: IndianRupee, label: "Real Campaign Budgets" },
  { icon: MapPin, label: "Built for Pune" },
];

export function TrustBadgesStrip() {
  return (
    <section className="relative py-10 px-6" id="trust" style={{ background: "#0B0D13" }}>
      <h2 className="sr-only">Why brands and creators trust You Collab</h2>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-x-10 gap-y-4"
      >
        {BADGES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[#5B8CFF]" aria-hidden="true" />
            <span className="text-[13px] font-medium text-white/45">{label}</span>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
