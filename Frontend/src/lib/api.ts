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
});

// Clerk's session token is short-lived and auto-rotated; fetching it fresh
// on every request (it's cached/no-op'd internally by Clerk unless near
// expiry) avoids needing our own refresh-on-401 dance.
apiClient.interceptors.request.use(async (config) => {
  const token = await window.Clerk?.session?.getToken();
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
