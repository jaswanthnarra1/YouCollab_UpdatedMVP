import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { FAQ_ENTRIES } from "./faqData";

export function FAQSection() {
  return (
    <section className="relative py-28 px-6 overflow-hidden" id="faq" style={{ background: "#0F1115" }}>
      <div className="mx-auto max-w-[720px] relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#5B8CFF] font-semibold mb-4">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" /> FAQ
          </p>
          <h2
            className="font-semibold tracking-[-0.03em] leading-[1.15] text-white mx-auto"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
          >
            Frequently asked questions
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        >
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ENTRIES.map((entry, i) => (
              <AccordionItem key={entry.question} value={`item-${i}`} className="border-white/[0.08]">
                <AccordionTrigger className="text-white/90 hover:no-underline">{entry.question}</AccordionTrigger>
                <AccordionContent className="text-[14px] text-white/45 leading-relaxed">
                  {entry.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
