import { useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { LayoutDashboard, PlusSquare, User, Inbox, BadgeCheck, MonitorSmartphone } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MOCK_PLAN_USAGE,
  MOCK_GIGS,
  MOCK_CREATOR_PROFILE,
  MOCK_APPLICATIONS,
} from "./productShowcaseData";

const glassPanel = "rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5";
const mockField = "rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] text-white/50";

function ProgressBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div className="h-1.5 rounded-full bg-[#2353E9]" style={{ width: `${pct}%` }} />
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={glassPanel}>
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
          {MOCK_PLAN_USAGE.planName} plan usage
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex justify-between text-[12px] text-white/60 mb-1.5">
              <span>Campaigns</span>
              <span className="tabular-nums">{MOCK_PLAN_USAGE.campaignsUsed}/{MOCK_PLAN_USAGE.campaignLimit}</span>
            </div>
            <ProgressBar used={MOCK_PLAN_USAGE.campaignsUsed} limit={MOCK_PLAN_USAGE.campaignLimit} />
          </div>
          <div>
            <div className="flex justify-between text-[12px] text-white/60 mb-1.5">
              <span>Application slots</span>
              <span className="tabular-nums">{MOCK_PLAN_USAGE.slotsAllocated}/{MOCK_PLAN_USAGE.slotLimit}</span>
            </div>
            <ProgressBar used={MOCK_PLAN_USAGE.slotsAllocated} limit={MOCK_PLAN_USAGE.slotLimit} />
          </div>
        </div>
      </div>
      <div className={glassPanel}>
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Active campaigns</p>
        <div className="mt-4 space-y-3">
          {MOCK_GIGS.map((gig) => (
            <div key={gig.title} className="flex items-center justify-between border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">
              <div>
                <p className="text-[13px] font-medium text-white/85">{gig.title}</p>
                <p className="text-[11px] text-white/40">{gig.budget}</p>
              </div>
              <span className="text-[11px] font-semibold text-[#88a3ff]">{gig.applications} pitches</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreateCampaignMockup() {
  return (
    <div className={glassPanel + " max-w-[480px] mx-auto space-y-3"}>
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">New campaign</p>
      <div className={mockField} aria-hidden="true">Fitness Transformation Challenge</div>
      <div className="grid grid-cols-2 gap-3">
        <div className={mockField} aria-hidden="true">₹8,000 – 15,000</div>
        <div className={mockField} aria-hidden="true">Fitness</div>
      </div>
      <div className={mockField} aria-hidden="true">5km radius · Baner, Pune</div>
      <div className="rounded-full bg-[#2353E9]/40 text-white/70 text-center text-[13px] font-semibold py-2.5" aria-hidden="true">
        Publish Campaign
      </div>
    </div>
  );
}

function CreatorProfileMockup() {
  const c = MOCK_CREATOR_PROFILE;
  return (
    <div className={glassPanel + " max-w-[420px] mx-auto"}>
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 rounded-full bg-gradient-to-tr from-[#2353E9] to-indigo-500 flex items-center justify-center font-bold text-white text-sm">
          AM
          {c.verified && (
            <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-indigo-600 p-0.5 border border-[#12141C]">
              <BadgeCheck className="h-3 w-3 text-white" aria-hidden="true" />
            </span>
          )}
        </div>
        <div>
          <p className="text-[14px] font-semibold text-white/90">{c.name}</p>
          <p className="text-[12px] text-[#88a3ff]">{c.handle}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white/[0.03] p-2">
          <p className="text-[9px] uppercase text-white/40">Niche</p>
          <p className="text-[12px] font-semibold text-white/85">{c.niche}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2">
          <p className="text-[9px] uppercase text-white/40">Reach</p>
          <p className="text-[12px] font-semibold text-white/85">{c.followers}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2">
          <p className="text-[9px] uppercase text-white/40">Engagement</p>
          <p className="text-[12px] font-semibold text-white/85">{c.engagement}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-white/40">{c.location}</p>
    </div>
  );
}

function ApplicationsMockup() {
  return (
    <div className={glassPanel + " space-y-3 max-w-[560px] mx-auto"}>
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Applications</p>
      {MOCK_APPLICATIONS.map((app) => (
        <div key={app.handle} className="flex items-center justify-between gap-3 border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-white/85 truncate">
              {app.name} <span className="text-white/40 font-normal">{app.handle}</span>
            </p>
            <p className="text-[11px] text-white/40 truncate">{app.note}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
              app.status === "ACCEPTED" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"
            }`}
          >
            {app.status}
          </span>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard, panel: <DashboardMockup /> },
  { value: "create", label: "Create Campaign", icon: PlusSquare, panel: <CreateCampaignMockup /> },
  { value: "profile", label: "Creator Profile", icon: User, panel: <CreatorProfileMockup /> },
  { value: "applications", label: "Applications", icon: Inbox, panel: <ApplicationsMockup /> },
];

export function ProductShowcase() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section className="relative py-28 px-6 overflow-hidden" id="product" style={{ background: "#0B0D13" }}>
      <div className="mx-auto max-w-[900px] relative z-10">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#5B8CFF] font-semibold mb-4">
            <MonitorSmartphone className="h-3.5 w-3.5" aria-hidden="true" /> Product
          </p>
          <h2
            className="font-semibold tracking-[-0.03em] leading-[1.15] text-white mx-auto"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
          >
            See it before you sign up.
          </h2>
        </motion.div>

        <Tabs defaultValue="dashboard">
          <div className="flex justify-center mb-6">
            <TabsList className="bg-white/[0.03] border border-white/[0.06] flex-wrap h-auto">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="gap-1.5 data-[state=active]:bg-[#2353E9] data-[state=active]:text-white text-white/50"
                >
                  <t.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Browser-chrome frame */}
          <div className="rounded-[20px] border border-white/[0.08] bg-[#12141C] shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#0F1115] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              <div className="ml-3 flex-1 rounded-md bg-white/[0.04] px-3 py-1 text-[11px] text-white/35 truncate">
                youcollab.app/dashboard/brand
              </div>
            </div>
            <div className="p-6">
              {TABS.map((t) => (
                <TabsContent key={t.value} value={t.value} className="mt-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={t.value}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      {t.panel}
                    </motion.div>
                  </AnimatePresence>
                </TabsContent>
              ))}
            </div>
          </div>
        </Tabs>
      </div>
    </section>
  );
}
