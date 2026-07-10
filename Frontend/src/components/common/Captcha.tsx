import ReCAPTCHA from "react-google-recaptcha";
import { forwardRef } from "react";
import { useTheme } from "next-themes";

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;
if (!SITE_KEY) {
  throw new Error("Missing VITE_RECAPTCHA_SITE_KEY environment variable");
}

interface Props {
  onChange: (token: string | null) => void;
}

// Shared "I'm not a robot" widget used on every form Google reCAPTCHA v2
// protects (login, signup, forgot-password, contact). Forwards the ref so
// callers can call .reset() after a submit attempt — v2 tokens are single-use.
export const Captcha = forwardRef<ReCAPTCHA, Props>(({ onChange }, ref) => {
  const { resolvedTheme } = useTheme();
  return (
    <div className="flex justify-center">
      <ReCAPTCHA
        ref={ref}
        sitekey={SITE_KEY}
        onChange={onChange}
        onExpired={() => onChange(null)}
        onErrored={() => onChange(null)}
        theme={resolvedTheme === "light" ? "light" : "dark"}
      />
    </div>
  );
});
Captcha.displayName = "Captcha";
