import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Check, Send } from "lucide-react";
import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";

/**
 * Multi-stage submit button for sending a pitch.
 *
 * The stages are paced by minimum durations but *gated on the real request*:
 * the success stage is never shown until the promise actually resolves. If the
 * API is faster than the animation the remaining stages still play out; if it
 * is slower the button holds on "Reviewing" until it settles. A rejection at
 * any point cuts straight to the error stage rather than finishing the
 * choreography — showing "Reviewing" for a request that has already failed
 * would be lying to the user.
 */

type Phase = "idle" | "submitting" | "progress" | "reviewing" | "success" | "error";

const STAGE_MS = { submitting: 700, progress: 800, reviewing: 800 } as const;

/** How long the green success chip stays on screen before onSuccess runs.
 *  Without this the caller (which typically closes the dialog) tears the
 *  component down in the same tick the success state is set, so the chip and
 *  its checkmark pop are never actually seen. */
const SUCCESS_DWELL_MS = 1000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const EASE = [0.22, 1, 0.36, 1] as const;

/** Ring that fills as the pitch advances — the reference image's status glyphs. */
function StatusRing({ progress, spin }: { progress: number; spin?: boolean }) {
  const R = 7;
  const C = 2 * Math.PI * R;
  const reduce = useReducedMotion();
  return (
    <motion.svg
      viewBox="0 0 18 18"
      className="h-3.5 w-3.5 shrink-0"
      animate={spin && !reduce ? { rotate: 360 } : { rotate: 0 }}
      transition={spin && !reduce ? { duration: 1.1, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
    >
      <circle cx="9" cy="9" r={R} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={2.5} />
      <motion.circle
        cx="9" cy="9" r={R} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
        transform="rotate(-90 9 9)"
        strokeDasharray={C}
        initial={false}
        animate={{ strokeDashoffset: C * (1 - progress) }}
        transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
      />
    </motion.svg>
  );
}

/** Per-stage copy, glyph and colour. Colours are design-system tokens, so this
 *  tracks light/dark automatically rather than hard-coding the reference hues. */
const STAGES: Record<Exclude<Phase, "idle">, { label: string; className: string; icon: React.ReactNode }> = {
  submitting: {
    label: "Submitting…",
    className: "bg-muted text-muted-foreground",
    icon: <StatusRing progress={0.15} spin />,
  },
  progress: {
    label: "In progress",
    className: "bg-warning/15 text-warning shadow-[0_0_18px_-4px_hsl(var(--warning)/0.55)]",
    icon: <StatusRing progress={0.4} />,
  },
  reviewing: {
    label: "Reviewing",
    className: "bg-info/15 text-info shadow-[0_0_18px_-4px_hsl(var(--info)/0.55)]",
    icon: <StatusRing progress={0.75} />,
  },
  success: {
    label: "Pitch submitted",
    className: "bg-success/15 text-success shadow-[0_0_22px_-4px_hsl(var(--success)/0.6)]",
    icon: <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />,
  },
  error: {
    label: "Submission failed",
    className: "bg-destructive/15 text-destructive",
    icon: <AlertCircle className="h-3.5 w-3.5 shrink-0" />,
  },
};

interface Props {
  /** Must reject to trigger the error stage — a resolved promise means success. */
  onSubmit: () => Promise<unknown>;
  /** Fired once the success stage has been shown, e.g. to close the dialog. */
  onSuccess?: () => void;
  disabled?: boolean;
  className?: string;
}

export function PitchSubmitButton({ onSubmit, onSuccess, disabled, className }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const reduce = useReducedMotion();
  // Guards against a double-submit racing past the phase check below.
  const runningRef = useRef(false);

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("submitting");

    let failed = false;
    const request = onSubmit().then(
      () => { /* resolved */ },
      () => { failed = true; }
    );

    // Hold a stage for its minimum duration, but cut it short the moment the
    // request is known to have failed.
    const hold = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ms);
        void request.then(() => {
          if (failed) { clearTimeout(t); resolve(); }
        });
      });

    const bail = () => {
      setPhase("error");
      runningRef.current = false;
    };

    if (reduce) {
      // Reduced motion: no theatre. Wait for the real result and report it.
      await request;
      if (failed) return bail();
      setPhase("success");
      runningRef.current = false;
      // Still hold briefly — the confirmation needs to be readable even when
      // the transitions between stages are suppressed.
      await sleep(SUCCESS_DWELL_MS);
      onSuccess?.();
      return;
    }

    await hold(STAGE_MS.submitting);
    if (failed) return bail();

    setPhase("progress");
    await hold(STAGE_MS.progress);
    if (failed) return bail();

    setPhase("reviewing");
    await hold(STAGE_MS.reviewing);
    if (failed) return bail();

    // Never claim success before the request has actually settled.
    await request;
    if (failed) return bail();

    setPhase("success");
    runningRef.current = false;
    // Let the checkmark pop land and be read before handing back to the caller.
    await sleep(SUCCESS_DWELL_MS);
    onSuccess?.();
  }, [onSubmit, onSuccess, reduce]);

  const retry = () => {
    runningRef.current = false;
    setPhase("idle");
  };

  if (phase === "idle") {
    return (
      <Button
        onClick={run}
        disabled={disabled}
        className={cn("w-full h-9 text-[13px] rounded-sm bg-gradient-brand text-primary-foreground border-0", className)}
      >
        <Send className="h-3.5 w-3.5 mr-1" /> Send pitch
      </Button>
    );
  }

  const stage = STAGES[phase];

  return (
    <div className={cn("w-full flex flex-col items-center gap-2", className)}>
      {/* layout drives the width morph between stages of different label lengths */}
      <motion.div
        layout
        role="status"
        aria-live="polite"
        transition={{ layout: { duration: reduce ? 0 : 0.45, ease: EASE } }}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium select-none",
          stage.className
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`${phase}-icon`}
            initial={{ scale: reduce ? 1 : 0.5, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              // Checkmark gets an extra pop on arrival.
              ...(phase === "success" && !reduce ? { scale: [0.5, 1.25, 1] } : {}),
            }}
            exit={{ scale: reduce ? 1 : 0.5, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
            className="flex items-center"
          >
            {stage.icon}
          </motion.span>
        </AnimatePresence>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`${phase}-label`}
            initial={{ y: reduce ? 0 : 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reduce ? 0 : -6, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
            className="whitespace-nowrap"
          >
            {stage.label}
          </motion.span>
        </AnimatePresence>
      </motion.div>

      {phase === "error" && (
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
          className="w-full"
        >
          <Button onClick={retry} variant="outline" className="w-full h-9 text-[13px] rounded-sm">
            Try again
          </Button>
        </motion.div>
      )}
    </div>
  );
}
