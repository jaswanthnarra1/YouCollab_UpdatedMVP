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

apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
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
