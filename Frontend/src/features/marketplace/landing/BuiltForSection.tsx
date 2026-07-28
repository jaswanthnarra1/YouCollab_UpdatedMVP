import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { BUILT_FOR_TAGS } from "./builtForData";

export function BuiltForSection() {
  return (
    <section className="relative py-20 px-6 overflow-hidden" id="built-for" style={{ background: "#0F1115" }}>
      <div className="mx-auto max-w-[900px] relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#5B8CFF] font-semibold mb-4">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> Built For
          </p>
          <h2
            className="font-semibold tracking-[-0.03em] leading-[1.15] text-white mx-auto"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
          >
            Real categories. Real creators.
          </h2>
        </motion.div>

        <div className="mt-8 flex flex-wrap justify-center gap-3" role="list">
          {BUILT_FOR_TAGS.map((tag, i) => (
            <motion.span
              key={tag}
              role="listitem"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[13px] text-white/70"
            >
              {tag}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
