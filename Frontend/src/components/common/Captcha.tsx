import ReCAPTCHA from "react-google-recaptcha";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;
if (!SITE_KEY) {
  throw new Error("Missing VITE_RECAPTCHA_SITE_KEY environment variable");
}

// Google's fixed "normal" size widget dimensions — it doesn't resize itself,
// so on any container narrower than this (every phone, and this app's ~344px
// auth cards) it overflows and looks broken/misaligned.
const WIDGET_WIDTH = 304;
const WIDGET_HEIGHT = 78;

interface Props {
  onChange: (token: string | null) => void;
}

// Shared "I'm not a robot" widget used on every form Google reCAPTCHA v2
// protects (login, signup, forgot-password, contact). Forwards the ref so
// callers can call .reset() after a submit attempt — v2 tokens are single-use.
// Scales itself down to fit its container instead of overflowing it, and
// reserves exactly the scaled height so it doesn't leave a gap below.
export const Captcha = forwardRef<ReCAPTCHA, Props>(({ onChange }, ref) => {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / WIDGET_WIDTH));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex justify-center"
      style={{ height: WIDGET_HEIGHT * scale }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
        <ReCAPTCHA
          ref={ref}
          sitekey={SITE_KEY}
          onChange={onChange}
          onExpired={() => onChange(null)}
          onErrored={() => onChange(null)}
          theme={resolvedTheme === "light" ? "light" : "dark"}
        />
      </div>
    </div>
  );
});
Captcha.displayName = "Captcha";
