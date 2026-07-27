import { describe, expect, it } from "vitest";
import {
  daysUntilExpiry,
  isGigOpenForApplications,
  resolveGigStatus,
} from "@/components/common/gig-status-badge";

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

describe("resolveGigStatus", () => {
  it("passes through non-ACTIVE statuses untouched", () => {
    expect(resolveGigStatus({ status: "DRAFT" })).toBe("DRAFT");
    expect(resolveGigStatus({ status: "CLOSED" })).toBe("CLOSED");
    expect(resolveGigStatus({ status: "EXPIRED" })).toBe("EXPIRED");
  });

  it("keeps an ACTIVE gig inside its window active", () => {
    expect(resolveGigStatus({ status: "ACTIVE", expiresAt: inDays(3) })).toBe("ACTIVE");
  });

  // The scheduler only sweeps periodically, so a lapsed gig can still be
  // flagged ACTIVE in the DB. The UI must not advertise it as open.
  it("treats a lapsed ACTIVE gig as expired between sweeps", () => {
    expect(resolveGigStatus({ status: "ACTIVE", expiresAt: inDays(-1) })).toBe("EXPIRED");
  });

  it("treats an ACTIVE gig with no expiry as active", () => {
    expect(resolveGigStatus({ status: "ACTIVE", expiresAt: null })).toBe("ACTIVE");
  });
});

describe("isGigOpenForApplications", () => {
  it("is closed once capacity is reached", () => {
    const gig = { status: "ACTIVE" as const, expiresAt: inDays(5), applicationSlots: 8, applicationsReceived: 8 };
    expect(isGigOpenForApplications(gig)).toBe(false);
  });

  it("is open with slots remaining", () => {
    const gig = { status: "ACTIVE" as const, expiresAt: inDays(5), applicationSlots: 8, applicationsReceived: 7 };
    expect(isGigOpenForApplications(gig)).toBe(true);
  });

  it("is closed when expired even with slots free", () => {
    const gig = { status: "ACTIVE" as const, expiresAt: inDays(-1), applicationSlots: 8, applicationsReceived: 0 };
    expect(isGigOpenForApplications(gig)).toBe(false);
  });
});

describe("daysUntilExpiry", () => {
  it("returns null when there is no expiry", () => {
    expect(daysUntilExpiry(null)).toBeNull();
  });

  it("clamps a past expiry to 0 rather than going negative", () => {
    expect(daysUntilExpiry(inDays(-5))).toBe(0);
  });

  it("rounds up so a partial day still reads as a day left", () => {
    expect(daysUntilExpiry(new Date(Date.now() + 3600_000).toISOString())).toBe(1);
  });
});
