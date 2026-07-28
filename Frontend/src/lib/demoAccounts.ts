// Clerk only skips real SMS for its reserved test-mode range (+1 555-01XX),
// with a fixed, non-configurable code of 424242 — see
// https://clerk.com/docs/testing/test-emails-and-phones. These entries let a
// demoer type a memorable digit string + code and ride that real Clerk test
// path underneath, without knowing the actual US test number/code.
// To add another demo account: add a digit string -> Clerk test number here,
// and provision it with `node Backend/supabase/seed-demo-accounts.js`.
export const DEMO_PHONE_MAP: Record<string, string> = {
  "9999999999": "+12015550100", // Demo Brand
  "8888888888": "+12015550101", // Demo Creator
};

export const DEMO_OTP = "123456";
const CLERK_TEST_OTP = "424242";

export function resolveDemoPhone(digits: string): string | null {
  return DEMO_PHONE_MAP[digits] ?? null;
}

export function resolveOtpCode(phone: string, code: string): string {
  const isDemoPhone = Object.values(DEMO_PHONE_MAP).includes(phone);
  return isDemoPhone && code === DEMO_OTP ? CLERK_TEST_OTP : code;
}
