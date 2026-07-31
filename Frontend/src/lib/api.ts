import axios from "axios";

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.DEV ? "http://localhost:5000" : "");

declare global {
  interface Window {
    Clerk?: {
      session?: { getToken: () => Promise<string | null> } | null;
    };
  }
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

/**
 * Root-cause fix for an app-wide infinite-spinner bug: this interceptor runs
 * before every request axios sends, so an unbounded await here blocks the
 * request from ever being dispatched — axios' own `timeout` option only
 * covers the network round-trip, not time spent here. If Clerk's session
 * token fetch ever hangs (third-party-cookie blocking, a Clerk network
 * hiccup) with no timeout, the promise neither resolves nor rejects, so a
 * caller's try/catch/finally — e.g. AuthBootstrap, which wraps the entire
 * router outside <Routes> — never gets a chance to run, and every route
 * stays on its loading state forever. Racing it against a timeout guarantees
 * the request proceeds (unauthenticated, if the token genuinely couldn't be
 * fetched — the existing 401 interceptor below already redirects to /login
 * for that case) instead of hanging indefinitely.
 */
const getTokenWithTimeout = (timeoutMs = 8000): Promise<string | null> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    Promise.resolve(window.Clerk?.session?.getToken())
      .then((token) => {
        clearTimeout(timer);
        resolve(token ?? null);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });

// Clerk's session token is short-lived and auto-rotated; fetching it fresh
// on every request (it's cached/no-op'd internally by Clerk unless near
// expiry) avoids needing our own refresh-on-401 dance.
apiClient.interceptors.request.use(async (config) => {
  const token = await getTokenWithTimeout();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Routes that are themselves *resolving* authentication. A 401 on these is a
 * normal, expected outcome the page handles itself (showing a retry, an error,
 * or a role picker) — it must NOT trigger the redirect below.
 *
 * This was the engine of a production infinite-redirect loop: a 401 on
 * /oauth-role hard-reloaded the browser to /login, AuthPage saw Clerk's
 * still-valid client session and immediately routed back to /oauth-role, which
 * 401'd again — forever. Because window.location.href tears the page down
 * synchronously, it also preempted /oauth-role's own error UI, so the failure
 * could never surface to the user or be retried.
 */
const AUTH_FLOW_PATHS = [
  "/login",
  "/register",
  "/oauth-role",
  "/sso-callback",
  "/verify-otp",
  "/verify-login-otp",
  "/forgot-password",
];

const isOnAuthFlowPage = () =>
  typeof window !== "undefined" &&
  AUTH_FLOW_PATHS.some((p) => window.location.pathname.startsWith(p));

apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    // Only bounce to /login for a session that expired *mid-session* on a real
    // app page. Auth-flow pages own their own 401 handling.
    if (error.response?.status === 401 && !isOnAuthFlowPage()) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const unwrap = <T,>(d: { data?: T } | T): T => {
  if (d && typeof d === "object" && "data" in (d as Record<string, unknown>)) {
    return (d as { data: T }).data;
  }
  return d as T;
};
