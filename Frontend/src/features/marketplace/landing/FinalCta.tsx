import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export function FinalCta() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section
      className="relative py-32 px-6 overflow-hidden"
      id="bottom-cta"
      style={{
        background: isDark
          ? "linear-gradient(180deg, #0f1a4a 0%, #080c24 100%)"
          : "linear-gradient(180deg, #2353E9 0%, #1B3FCC 100%)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute rounded-full"
          style={{
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "60%", height: "90%",
            background: isDark
              ? "radial-gradient(ellipse, rgba(35,83,233,0.12) 0%, transparent 70%)"
              : "radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      <div className="mx-auto max-w-[600px] text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-semibold tracking-[-0.03em] text-white leading-[1.1]"
          style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Ready to launch your next creator campaign?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mt-5 text-[15px] text-white/45 max-w-[420px] mx-auto leading-relaxed"
        >
          Join the brands and creators using You Collab to run real campaigns —
          verified profiles, structured pitches, zero DMs.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="mt-10 flex flex-col sm:flex-row justify-center gap-3"
        >
          <Link to="/register">
            <button
              className="group w-full sm:w-auto bg-white text-[#2353E9] rounded-full px-8 py-3.5
                font-semibold text-sm
                shadow-xl shadow-black/[0.08]
                hover:shadow-2xl hover:shadow-black/[0.15]
                hover:scale-[1.04] active:scale-[0.98]
                transition-all duration-300
                flex items-center justify-center gap-2.5"
              id="bottom-cta-btn"
            >
              Start Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
          </Link>
          <Link to="/contact">
            <button
              className="w-full sm:w-auto rounded-full border border-white/25 px-8 py-3.5
                font-semibold text-sm text-white
                hover:bg-white/10
                transition-all duration-300"
            >
              Talk to Us
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
