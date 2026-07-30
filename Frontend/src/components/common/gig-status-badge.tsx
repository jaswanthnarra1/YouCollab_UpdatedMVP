import type { GigStatus } from "@/types";

/**
 * Single source of truth for how a gig status looks and reads, so the dashboard,
 * detail page and marketplace can't drift apart on wording or colour.
 */
const STATUS_STYLES: Record<GigStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "border-success/25 text-success bg-success/10" },
  EXPIRED: { label: "Expired", className: "border-warning/25 text-warning bg-warning/10" },
  CLOSED: { label: "Closed", className: "border-border text-muted-foreground" },
  DRAFT: { label: "Draft", className: "border-info/25 text-info bg-info/10" },
};

/**
 * A gig can be past its expiry while still flagged ACTIVE, between scheduler
 * sweeps. Treat that as expired everywhere so the UI never advertises a gig the
 * backend would reject an application for.
 */
export const resolveGigStatus = (gig?: { status?: GigStatus; expiresAt?: string | null }): GigStatus => {
  if (!gig?.status) return "ACTIVE";
  if (gig.status === "ACTIVE" && gig.expiresAt && new Date(gig.expiresAt) <= new Date()) return "EXPIRED";
  return gig.status;
};

export const isGigOpenForApplications = (gig?: {
  status?: GigStatus;
  expiresAt?: string | null;
  applicationSlots?: number;
  applicationsReceived?: number;
}) => {
  if (resolveGigStatus(gig) !== "ACTIVE") return false;
  if (gig?.applicationSlots != null && gig?.applicationsReceived != null) {
    return gig.applicationsReceived < gig.applicationSlots;
  }
  return true;
};

/** Days left before expiry, or null when there's no expiry to count down to. */
export const daysUntilExpiry = (expiresAt?: string | null): number | null => {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86400000);
};

export function GigStatusBadge({
  gig,
  className = "",
}: {
  gig?: { status?: GigStatus; expiresAt?: string | null };
  className?: string;
}) {
  const status = resolveGigStatus(gig);
  const { label, className: styles } = STATUS_STYLES[status];

  return (
    <span
      className={`inline-block border px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded-sm ${styles} ${className}`}
    >
      {label}
    </span>
  );
}
