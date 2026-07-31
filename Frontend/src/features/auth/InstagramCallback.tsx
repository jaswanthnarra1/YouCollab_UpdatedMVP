import { CheckCircle2, XCircle } from "lucide-react";
import { instagramService, IG_RETURN_TO_KEY, IG_LAST_ERROR_KEY } from "@/services/instagram";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_RETURN = "/dashboard/influencer";
/** Long enough for the success tick to register, short enough not to feel like a wait. */
const SUCCESS_DWELL_MS = 1100;

const readReturnTo = () => {
  const stored = sessionStorage.getItem(IG_RETURN_TO_KEY);
  sessionStorage.removeItem(IG_RETURN_TO_KEY);
  // Only ever return to an in-app path — never trust this to be an absolute URL.
  return stored && stored.startsWith("/") && !stored.startsWith("//") ? stored : DEFAULT_RETURN;
};

export default function InstagramCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  // OAuth codes are single-use: React 18 StrictMode double-invokes effects in
  // dev, and a second exchange of the same code always fails. Guard it.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");
    const errorReason = params.get("error_reason");
    const errorDescription = params.get("error_description");

    // Never strand the user on this route — every path below ends in a
    // navigate() back into the app.
    const failAndReturn = (msg: string, code?: string) => {
      setStatus("error");
      setMessage(msg);
      // Survives the redirect below so the card can show a durable reason —
      // the toast alone disappears before most users read it.
      sessionStorage.setItem(IG_LAST_ERROR_KEY, code ? `${msg} (${code})` : msg);
      toast({ variant: "destructive", title: "Instagram connection failed", description: msg });
      const dest = readReturnTo();
      setTimeout(() => navigate(dest, { replace: true }), SUCCESS_DWELL_MS);
    };

    if (oauthError) {
      failAndReturn(
        errorReason === "user_denied"
          ? "You cancelled the Instagram connection."
          : errorDescription || "Instagram authorization was denied."
      );
      return;
    }
    if (!code || !state) {
      failAndReturn("Missing authorization details from Instagram. Please try connecting again.");
      return;
    }

    (async () => {
      try {
        await instagramService.callback(code, state);
        // Refresh the cached profile so the card is already in its connected
        // state by the time we land back on it — no manual page refresh.
        await qc.invalidateQueries({ queryKey: ["instagramProfile"] });
        sessionStorage.removeItem(IG_LAST_ERROR_KEY);
        setStatus("success");
        toast({ title: "Instagram connected ✨", description: "Your profile metrics are now syncing." });
        const dest = readReturnTo();
        setTimeout(() => navigate(dest, { replace: true }), SUCCESS_DWELL_MS);
      } catch (e) {
        const err = e as { response?: { data?: { error?: { message?: string; code?: string } } } };
        failAndReturn(
          err?.response?.data?.error?.message ?? "Connection failed. Please try again.",
          err?.response?.data?.error?.code
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 neon-grid pointer-events-none" />
      <Navbar />
      <main className="relative mx-auto max-w-md px-4 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-8 text-center"
        >
          {status === "loading" && (
            <>
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
              <h1 className="mt-4 text-xl font-semibold">Linking your Instagram…</h1>
              <p className="text-sm text-muted-foreground mt-1">This should only take a second.</p>
            </>
          )}
          {status === "success" && (
            <>
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
              >
                <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
              </motion.div>
              <h1 className="mt-4 text-xl font-semibold">Instagram connected ✨</h1>
              <p className="text-sm text-muted-foreground mt-1">Taking you back…</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <h1 className="mt-4 text-xl font-semibold">Couldn't connect</h1>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
              <p className="text-xs text-muted-foreground/70 mt-3">Returning you to the app…</p>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
