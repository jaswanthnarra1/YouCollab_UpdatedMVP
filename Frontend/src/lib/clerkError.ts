interface ClerkApiError {
  errors?: Array<{ message?: string; longMessage?: string }>;
  message?: string;
}

export const clerkErrorMessage = (err: unknown, fallback = "Something went wrong"): string => {
  const e = err as ClerkApiError;
  return e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || fallback;
};
