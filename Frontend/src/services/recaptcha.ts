import { apiClient } from "@/lib/api";

// Pre-flight captcha check for flows Clerk owns client-side (login, signup,
// forgot-password) — those never hit our backend themselves, so this is the
// gate that stands in front of them. Throws if verification fails.
export const verifyCaptchaToken = async (captchaToken: string) => {
  await apiClient.post("/api/recaptcha/verify", { captchaToken });
};
