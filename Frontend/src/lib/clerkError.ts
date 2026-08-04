interface ClerkApiError {
  errors?: Array<{ message?: string; longMessage?: string; code?: string }>;
  message?: string;
}

export const clerkErrorMessage = (err: unknown, fallback = "Something went wrong"): string => {
  const e = err as ClerkApiError;
  const first = e?.errors?.[0];
  if (
    first?.code === "client_sign_up_not_found" ||
    first?.message?.includes("No sign up attempt was found") ||
    e?.message?.includes("No sign up attempt was found")
  ) {
    return "Your sign-up session expired or was not found. Please try submitting again.";
  }
  return first?.longMessage || first?.message || e?.message || fallback;
};
