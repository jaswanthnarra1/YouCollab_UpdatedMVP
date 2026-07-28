import { ArrowRight, Sun, Moon, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { HeroShineText } from "@/components/common/HeroShineText";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { PricingSection } from "./pricing/PricingSection";
import { TrustBadgesStrip } from "./landing/TrustBadgesStrip";
import { BuiltForSection } from "./landing/BuiltForSection";
import { HowItWorksSection } from "./landing/HowItWorksSection";
import { FeaturesGrid } from "./landing/FeaturesGrid";
import { ProductShowcase } from "./landing/ProductShowcase";
import { FAQSection } from "./landing/FAQSection";
import { FinalCta } from "./landing/FinalCta";
import { LandingFooter } from "./landing/LandingFooter";

/* ═══════════════════════════════════════════════════
   Floating Product Cards — Capsule-style hero cards
   ═══════════════════════════════════════════════════ */

const BrandCampaignCard = () => (
  <div className="bg-white/95 dark:bg-[#1A1A24] border border-[#2353E9]/[0.08] dark:border-white/[0.06] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.01),0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35),0_1px_4px_rgba(0,0,0,0.15)] p-5 w-[240px] relative overflow-hidden group hover:border-[#2353E9]/30 dark:hover:border-[#2353E9]/40 transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2353E9] to-indigo-500 flex items-center justify-center font-bold text-white text-[11px] shadow-sm">
          US
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-800 dark:text-white/80 leading-none">UrbanFit Studio</p>
          <span className="text-[9px] text-slate-500 dark:text-white/55">Brand Partner</span>
        </div>
      </div>
      <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/25 px-2 py-0.5 rounded-full flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">Active</span>
      </div>
    </div>

    <div className="space-y-3">
      <div>
        <div className="text-[10px] text-slate-500 dark:text-white/55 uppercase tracking-wider font-medium">Campaign</div>
        <div className="text-[13px] font-semibold text-slate-800 dark:text-white/90">Fitness Transformation Challenge</div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
        <div>
          <div className="text-[9px] text-slate-500 dark:text-white/55">Budget</div>
          <div className="text-xs font-bold text-slate-800 dark:text-white/90">₹8K–15K</div>
        </div>
        <div>
          <div className="text-[9px] text-slate-500 dark:text-white/55">Applications</div>
          <div className="text-xs font-bold text-[#2353E9] dark:text-[#88a3ff]">12 Pitches</div>
        </div>
      </div>
    </div>
  </div>
);

const AIMatchCard = () => (
  <div className="bg-white/95 dark:bg-[#1A1A24] border border-[#2353E9]/[0.08] dark:border-white/[0.06] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.01),0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35),0_1px_4px_rgba(0,0,0,0.15)] p-5 w-[220px] relative overflow-hidden group hover:border-[#2353E9]/30 dark:hover:border-[#2353E9]/40 transition-all duration-300">
    <div className="flex items-center mb-3">
      <span className="text-[10px] font-bold text-slate-500 dark:text-white/55 uppercase tracking-wider">AI Compatibility</span>
    </div>
    
    <div className="flex items-baseline gap-2 mb-3">
      <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#2353E9] to-[#5B8CFF] dark:from-[#2353E9] dark:to-[#88a3ff]">98%</span>
      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">High Match</span>
    </div>

    <div className="space-y-1.5 text-[10px] text-slate-500 dark:text-white/50 border-t border-slate-100 dark:border-white/[0.04] pt-2.5">
      <div className="flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-[#2353E9]" />
        <span>Verified Instagram profile</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-[#2353E9]" />
        <span>Baner, Pune radius match</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-[#2353E9]" />
        <span>Fitness/Wellness niche</span>
      </div>
    </div>
  </div>
);

const CreatorProfileCard = () => (
  <div className="bg-white/95 dark:bg-[#1A1A24] border border-[#2353E9]/[0.08] dark:border-white/[0.06] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.01),0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35),0_1px_4px_rgba(0,0,0,0.15)] p-5 w-[230px] relative overflow-hidden group hover:border-[#2353E9]/30 dark:hover:border-[#2353E9]/40 transition-all duration-300">
    <div className="flex items-center gap-3.5 mb-3.5">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2353E9] to-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow-md">
          AM
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 bg-indigo-600 text-white rounded-full p-0.5 border border-white dark:border-[#1A1A24]">
          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
        </div>
      </div>
      <div>
        <p className="text-[12px] font-semibold text-slate-800 dark:text-white/90 leading-none">Arjun Mehta</p>
        <span className="text-[10px] text-[#2353E9] dark:text-[#88a3ff] font-medium mt-1 inline-block">@arjun_fitlife</span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 dark:border-white/[0.04] pt-3 text-center">
      <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-2 border border-slate-100 dark:border-white/[0.02]">
        <div className="text-[9px] text-slate-500 dark:text-white/55 uppercase tracking-wider">Reach</div>
        <div className="text-xs font-bold text-slate-800 dark:text-white/90">72K</div>
      </div>
      <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-2 border border-slate-100 dark:border-white/[0.02]">
        <div className="text-[9px] text-slate-500 dark:text-white/55 uppercase tracking-wider">Engagement</div>
        <div className="text-xs font-bold text-slate-800 dark:text-white/90">5.8%</div>
      </div>
    </div>
  </div>
);

const AnalyticsCard = () => (
  <div className="bg-white/95 dark:bg-[#1A1A24] border border-[#2353E9]/[0.08] dark:border-white/[0.06] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.01),0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35),0_1px_4px_rgba(0,0,0,0.15)] p-5 w-[220px] relative overflow-hidden group hover:border-[#2353E9]/30 dark:hover:border-[#2353E9]/40 transition-all duration-300">
    <div className="flex items-center justify-between mb-3.5">
      <span className="text-[10px] font-semibold text-slate-500 dark:text-white/55 uppercase tracking-wider">Growth Analytics</span>
      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">Live</span>
    </div>
    
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div>
        <div className="text-[9px] text-slate-500 dark:text-white/55">Total ROI</div>
        <div className="text-[15px] font-extrabold text-slate-800 dark:text-white">12.8x</div>
      </div>
      <div>
        <div className="text-[9px] text-slate-500 dark:text-white/55">Growth</div>
        <div className="text-[15px] font-extrabold text-emerald-500">+18.2%</div>
      </div>
    </div>

    <div className="h-10 w-full mt-2 relative">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="analytics-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2353E9" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2353E9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,35 Q15,38 30,22 T60,15 T90,5 L100,5 L100,40 L0,40 Z"
          fill="url(#analytics-grad)"
        />
        <path
          d="M0,35 Q15,38 30,22 T60,15 T90,5"
          fill="none"
          stroke="#2353E9"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="90" cy="5" r="3" fill="#2353E9" />
      </svg>
    </div>
  </div>
);

/* ═══════════════════════════════════════
   Main Landing Page
   ═══════════════════════════════════════ */

const Landing = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ═══ Floating Pill Navbar ═══ */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50" id="landing-nav">
        <div
          className="flex items-center gap-1 sm:gap-4
            bg-white/90 dark:bg-[#0B1120]/80
            backdrop-blur-2xl
            border border-gray-200/50 dark:border-white/10
            rounded-full pl-5 pr-2 py-2
            shadow-lg shadow-black/[0.06] dark:shadow-black/30"
        >
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Logo className="h-7 w-7 rounded-md" />
            <span className="text-sm font-bold text-gray-900 dark:text-white sr-only sm:not-sr-only sm:inline tracking-tight">
              YouCollab
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-6">
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="h-8 w-8 flex items-center justify-center rounded-full
                text-gray-500 dark:text-gray-400
                hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              title="Toggle theme"
              id="theme-toggle"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <Link to="/login">
              <button
                className="text-[13px] font-medium text-gray-600 dark:text-gray-300
                  hover:text-gray-900 dark:hover:text-white
                  px-3 py-1.5 rounded-full
                  hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                id="login-link"
              >
                Log in
              </button>
            </Link>
            <Link to="/register">
              <button
                className="text-[13px] font-semibold bg-[#2353E9] text-white
                  px-5 py-2 rounded-full
                  hover:bg-[#1d47cc] transition-all duration-200
                  shadow-md shadow-blue-500/20
                  hover:shadow-lg hover:shadow-blue-500/30"
                id="signup-btn"
              >
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
      {/* ═══ Hero Section ═══ */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16 transition-colors duration-500"
        id="hero"
        style={{
          backgroundColor: isDark ? "#16151D" : "#4FA3FF",
          background: isDark
            ? "#16151D"
            : "linear-gradient(180deg, #2D8CFF 0%, #4FA3FF 50%, #73B7FF 100%)",
        }}
      >
        {/* ── Layer 2: Cloud Image (Capsule-inspired Environmental Background) ── */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 select-none transition-all duration-700"
          style={{
            opacity: isDark ? 0.08 : 0.22,
            backgroundImage: "url('/clouds.png')",
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* ── Layer 3: Blue Ambient Glow (above clouds) ── */}
        {isDark && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Radial blue glow behind the headline */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen"
              style={{
                width: "60vw",
                height: "60vw",
                maxWidth: "750px",
                maxHeight: "750px",
                background: "radial-gradient(circle, rgba(35,83,233,0.18), transparent 70%)",
                filter: "blur(90px)",
              }}
            />
            {/* Subtle blue ambient lighting */}
            <div
              className="absolute bottom-0 left-[20%] rounded-full opacity-35"
              style={{
                width: "30vw",
                height: "30vw",
                background: "radial-gradient(circle, rgba(91,140,255,0.08) 0%, transparent 70%)",
                filter: "blur(60px)",
              }}
            />
            <div
              className="absolute bottom-0 right-[20%] rounded-full opacity-35"
              style={{
                width: "30vw",
                height: "30vw",
                background: "radial-gradient(circle, rgba(91,140,255,0.08) 0%, transparent 70%)",
                filter: "blur(60px)",
              }}
            />
          </div>
        )}

        {/* ── Main Hero Layout Wrapper ── */}
        <div className="relative w-full max-w-[1250px] min-h-[580px] flex flex-col items-center justify-center z-10 px-4 mt-8">
          
          {/* Orbital path connections (Desktop only) */}
          <div className="hidden md:block absolute inset-0 pointer-events-none z-0">
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 1200 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="orbit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2353E9" stopOpacity="0.04" />
                  <stop offset="50%" stopColor="#2353E9" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#5B8CFF" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              <ellipse
                cx="600"
                cy="300"
                rx="480"
                ry="210"
                stroke="url(#orbit-grad)"
                strokeWidth="1.5"
                strokeDasharray="8 6"
                style={{
                  animation: "orbit-dash 40s linear infinite",
                }}
              />
              <ellipse
                cx="600"
                cy="300"
                rx="440"
                ry="180"
                stroke="rgba(35,83,233,0.06)"
                strokeWidth="1"
                strokeDasharray="4 8"
                opacity="0.6"
              />
            </svg>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes orbit-dash {
                to {
                  stroke-dashoffset: -100;
                }
              }
            `}} />
          </div>

          {/* Desktop Floating Cards */}
          {/* Top Left: AI Match Card (Card 2) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, y: [10, -10, 10] }}
            transition={{ 
              opacity: { duration: 0.8, delay: 0.3 },
              scale: { duration: 0.8, delay: 0.3 },
              y: { duration: 8, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute left-0 top-[10%] z-20 hidden md:block"
          >
            <AIMatchCard />
          </motion.div>

          {/* Bottom Left: Brand Campaign Card (Card 1) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, y: [-12, 12, -12] }}
            transition={{ 
              opacity: { duration: 0.8, delay: 0.4 },
              scale: { duration: 0.8, delay: 0.4 },
              y: { duration: 7, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute left-[3%] bottom-[8%] z-20 hidden md:block"
          >
            <BrandCampaignCard />
          </motion.div>

          {/* Top Right: Creator Profile Card (Card 3) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, y: [-8, 8, -8] }}
            transition={{ 
              opacity: { duration: 0.8, delay: 0.5 },
              scale: { duration: 0.8, delay: 0.5 },
              y: { duration: 6.5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute right-0 top-[8%] z-20 hidden md:block"
          >
            <CreatorProfileCard />
          </motion.div>

          {/* Bottom Right: Analytics Card (Card 4) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, y: [14, -14, 14] }}
            transition={{ 
              opacity: { duration: 0.8, delay: 0.6 },
              scale: { duration: 0.8, delay: 0.6 },
              y: { duration: 9, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute right-[3%] bottom-[8%] z-20 hidden md:block"
          >
            <AnalyticsCard />
          </motion.div>

          {/* Center Content: Headline, Subtitle, CTA */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-[650px] mx-auto py-12">
            {/* ── Hero Headline ── */}
            <motion.div
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 text-center mb-2"
            >
              <h1
                className="font-semibold leading-[1.05] tracking-[-0.035em] text-white"
                style={{
                  fontSize: "clamp(2.8rem, 7.5vw, 5.5rem)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  textShadow: isDark ? "0 4px 60px rgba(0,0,0,0.15)" : "0 4px 30px rgba(0,0,0,0.03)",
                }}
              >
                <HeroShineText>
                  Where Brands
                  <br />
                  Meet{" "}
                </HeroShineText>
                <span
                  className="text-transparent bg-clip-text select-none"
                  style={{
                    backgroundImage: "linear-gradient(to bottom, #4D7BFF 0%, #2353E9 50%, #1C44C5 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textShadow: "0 1px 0 #1C44C5, 0 2.5px 0 #1333A0, 0 2px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  Creators
                </span>
              </h1>
            </motion.div>

            {/* ── Subtitle ── */}
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              className="relative z-10 text-center text-white/80 dark:text-white/55 max-w-[420px] mb-10 leading-relaxed"
              style={{ fontSize: "clamp(0.9rem, 2.2vw, 1.1rem)" }}
            >
              Verified Instagram creators, real budgets, structured pitches
              <br />
              — no more DMs and guesswork.
            </motion.p>

            {/* ── CTA Buttons ── */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
              className="relative z-10 flex flex-col sm:flex-row items-center gap-3"
            >
              <Link to="/register">
                <button
                  className="group w-full sm:w-auto bg-white text-[#2353E9] rounded-full px-8 py-3.5
                    font-semibold text-sm
                    shadow-xl shadow-black/[0.08]
                    hover:shadow-2xl hover:shadow-black/[0.15]
                    hover:scale-[1.04] active:scale-[0.98]
                    transition-all duration-300
                    flex items-center justify-center gap-2"
                  id="hero-cta"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto rounded-full border border-white/25 px-8 py-3.5
                  font-semibold text-sm text-white text-center
                  hover:bg-white/10
                  transition-all duration-300"
              >
                See How It Works
              </a>
            </motion.div>
          </div>

          {/* Mobile/Tablet Connected Stack (displays vertically below CTA) */}
          <div className="flex flex-col items-center gap-6 md:hidden w-full max-w-[340px] mx-auto mt-8 z-20">
            <div className="w-px h-8 bg-slate-300 dark:bg-white/10" />
            <BrandCampaignCard />
            <div className="w-px h-8 bg-slate-300 dark:bg-white/10" />
            <AIMatchCard />
            <div className="w-px h-8 bg-slate-300 dark:bg-white/10" />
            <CreatorProfileCard />
            <div className="w-px h-8 bg-slate-300 dark:bg-white/10" />
            <AnalyticsCard />
          </div>
        </div>
      </section>

      {/* ═══ Trust ═══ */}
      <TrustBadgesStrip />

      {/* ═══ Built For ═══ */}
      <BuiltForSection />

      {/* ═══ How It Works ═══ */}
      <HowItWorksSection />

      {/* ═══ Features ═══ */}
      <FeaturesGrid />

      {/* ═══ Product Showcase ═══ */}
      <ProductShowcase />

      {/* ═══ Pricing ═══ */}
      <PricingSection />

      {/* ═══ FAQ ═══ */}
      <FAQSection />

      {/* ═══ Final CTA ═══ */}
      <FinalCta />
      </main>

      {/* ═══ Footer ═══ */}
      <LandingFooter />
    </div>
  );
};

export default Landing;
