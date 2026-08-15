import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

// Premium ease-out (expo-ish) — slow acceleration, gentle deceleration.
// Same curve for enter/exit keeps the two halves feeling like one motion.
const LUXURY_EASE = [0.16, 1, 0.3, 1] as const;

const variants = {
  initial: { opacity: 0, y: 14, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: LUXURY_EASE } },
  exit: { opacity: 0, y: -8, scale: 1.01, transition: { duration: 0.32, ease: LUXURY_EASE } },
};

const reducedVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/**
 * Wraps routed page content so navigating between authenticated screens
 * (dashboard, gigs, marketplace, profile, settings, ...) crossfades instead
 * of hard-cutting. Non-overlapping (exit fully completes before the next
 * page enters) so it never fights the scrollable `<main>`'s layout/height —
 * that's the one thing a dashboard shell can't afford to get wrong.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reduce = useReducedMotion();
  const v = reduce ? reducedVariants : variants;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={v}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
