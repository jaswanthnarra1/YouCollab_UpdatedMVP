import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";

// Renders while Clerk completes the OAuth handshake (Google, etc.), then
// force-redirects to /oauth-role regardless of new vs. returning user — that
// page decides whether a role still needs to be picked.
export default function SsoCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/oauth-role"
        signUpForceRedirectUrl="/oauth-role"
      />
    </div>
  );
}
