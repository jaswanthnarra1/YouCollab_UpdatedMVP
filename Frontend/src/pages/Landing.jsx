import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Users } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import useAuthStore from '../stores/authStore';
import { Logo } from '../components/ui/Logo';
import PremiumFintechSection from '../components/landing/PremiumFintechSection';

export const Landing = () => {
  const { isAuthenticated, user } = useAuthStore();

  const dashboardPath = user
    ? user.role === 'BRAND'
      ? '/dashboard/brand'
      : '/dashboard/influencer'
    : '/login';

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text overflow-hidden transition-colors duration-200">
      {/* Navbar Stub */}
      <nav className="border-b border-dark-border/40 bg-dark-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="w-full flex h-16 items-center justify-between px-6 max-w-[1600px] mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-auto drop-shadow-sm" />
            <span className="rounded-full bg-brand-blue/15 border border-brand-blue/20 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase tracking-widest">
              YOU-COLLAB
            </span>
          </Link>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button to={dashboardPath} variant="primary" size="sm">
                Dashboard
              </Button>
            ) : (
              <>
                <Link to="/login" className="text-xs font-bold text-dark-muted hover:text-dark-text transition-colors">
                  Sign In
                </Link>
                <Button to="/signup" variant="primary" size="sm">
                  Join Now
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Glow Effects (Teal & Cyan) */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse duration-10000" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-dark-card/30 rounded-full blur-[90px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-6 animate-fade-in">
          <Sparkles size={14} className="text-primary animate-pulse" />
          Pune's Premium Creator-Brand Hub
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1] text-dark-text">
          Where Pune's Brands Meet{' '}
          <span className="text-gradient-cyan">
            Top Creators
          </span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-dark-muted max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Post local collabs, apply with beautiful pitches, secure budget rates, and execute campaign deals with Pune's aesthetic community.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Button to="/signup" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 group" variant="primary">
            Start Collaborating
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button to="/login" variant="outline" size="lg" className="w-full sm:w-auto">
            Explore Pune Gigs
          </Button>
        </div>

        {/* Local Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-dark-border/40 pt-12 text-left">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-primary mb-1">500+</div>
            <div className="text-xs font-bold text-dark-muted uppercase tracking-wider">Aesthetic Creators</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mb-1">80+</div>
            <div className="text-xs font-bold text-dark-muted uppercase tracking-wider">Pune Cafes & Brands</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-primary mb-1">₹12L+</div>
            <div className="text-xs font-bold text-dark-muted uppercase tracking-wider">Campaign Budgets</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-dark-text mb-1">100%</div>
            <div className="text-xs font-bold text-dark-muted uppercase tracking-wider">Pune Focus</div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="bg-dark-surface py-20 border-y border-dark-border/40 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold mb-4 text-dark-text tracking-tight">Crafted for local high-growth networking</h2>
            <p className="text-sm font-semibold text-dark-muted">We provide everything you need to source, negotiate, and launch high-impact Pune marketing campaigns.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Fast & Direct Matches (matches Capital Efficiency style) */}
            <Card hoverable className="text-center flex flex-col items-center justify-center min-h-[270px] relative overflow-hidden">
              {/* Inner glowing accent */}
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#162C35] to-[#0D1E24] border border-[#1E3E49] flex items-center justify-center mb-6 shadow-glow-sm">
                <Zap size={20} className="text-primary" />
              </div>
              
              <h3 className="text-2xl font-bold text-dark-text mb-3 tracking-tight">Fast & Direct Matches</h3>
              <p className="text-dark-muted text-sm leading-relaxed font-medium max-w-[280px]">
                Skip agencies. Connect directly with specialized aesthetic niches in Pune.
              </p>
            </Card>

            {/* Card 2: Verified Local Gigs (matches Deep Liquidity style) */}
            <Card hoverable className="text-center flex flex-col items-center justify-center min-h-[270px] relative overflow-hidden">
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#162C35] to-[#0D1E24] border border-[#1E3E49] flex items-center justify-center mb-6 shadow-glow-sm">
                <ShieldCheck size={20} className="text-primary" />
              </div>
              
              <h3 className="text-2xl font-bold text-dark-text mb-3 tracking-tight">Verified Local Gigs</h3>
              <p className="text-dark-muted text-sm leading-relaxed font-medium max-w-[280px]">
                Every gig is verified. Secure transparent budget payouts in Koregaon Park and beyond.
              </p>
            </Card>

            {/* Card 3: Community Hub (matches Open-Source Protocol style) */}
            <Card hoverable className="text-center flex flex-col items-center justify-center min-h-[270px] relative overflow-hidden">
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#162C35] to-[#0D1E24] border border-[#1E3E49] flex items-center justify-center mb-6 shadow-glow-sm">
                <Users size={20} className="text-primary" />
              </div>
              
              <h3 className="text-2xl font-bold text-dark-text mb-3 tracking-tight">Community Hub</h3>
              <p className="text-dark-muted text-sm leading-relaxed font-medium max-w-[280px]">
                Connect and launch high-impact campaigns with fashionistas, foodies, and tech bloggers.
              </p>
            </Card>
          </div>

          {/* Design Process / Collaboration flow (exact match to Image 3) */}
          <div className="mt-28 border-t border-dark-border/20 pt-20">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-dark-bg border border-dark-border text-[10px] font-bold text-primary tracking-widest uppercase mb-4">
                Design Process
              </span>
              <h2 className="text-3xl font-extrabold mb-4 text-dark-text tracking-tight">How collaborations are engineered</h2>
              <p className="text-sm font-semibold text-dark-muted">Four simple phases designed to align brand goals with creator execution.</p>
            </div>            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
              {/* Phase 1: Discovery (Stepped Height: 200px) */}
              <Card hoverable className="p-6 relative flex flex-col justify-between h-[200px] text-left">
                <div className="flex justify-between items-start">
                  <h4 className="text-2xl font-bold text-dark-text leading-tight">Discovery</h4>
                  <span className="text-[11px] font-semibold text-dark-muted pt-1">3 days</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-6 mt-auto">
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">UX Research</span>
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">Competitor Analysis</span>
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">User Interviews</span>
                </div>
              </Card>

              {/* Phase 2: IA (Stepped Height: 250px) */}
              <Card hoverable className="p-6 relative flex flex-col justify-between h-[250px] text-left">
                <div className="flex justify-between items-start">
                  <h4 className="text-2xl font-bold text-dark-text leading-tight">Information<br />Architecture</h4>
                  <span className="text-[11px] font-semibold text-dark-muted pt-1">2 days</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-6 mt-auto">
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">Sitemap</span>
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">User Flows</span>
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">Information Architecture</span>
                </div>
              </Card>

              {/* Phase 3: Wireframing (Stepped Height: 300px) */}
              <Card hoverable className="p-6 relative flex flex-col justify-between h-[300px] text-left">
                <div className="flex justify-between items-start">
                  <h4 className="text-2xl font-bold text-dark-text leading-tight">Wireframing</h4>
                  <span className="text-[11px] font-semibold text-dark-muted pt-1">4 days</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-6 mt-auto">
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">Lo-fi Wireframes</span>
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">Figma</span>
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">Layout</span>
                </div>
              </Card>

              {/* Phase 4: UI Design (Stepped Height: 350px) */}
              <Card hoverable className="p-6 relative flex flex-col justify-between h-[350px] text-left">
                <div className="flex justify-between items-start">
                  <h4 className="text-2xl font-bold text-dark-text leading-tight">UI Design &<br />Design System</h4>
                  <span className="text-[11px] font-semibold text-dark-muted pt-1">7 days</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-6 mt-auto">
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">UI Design</span>
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">Design System</span>
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">Components</span>
                  <span className="text-[11px] font-medium text-dark-text bg-[#030303]/80 border border-dark-border px-3 py-1.5 rounded-full transition-colors hover:border-primary/40">Dark Theme</span>
                </div>
              </Card>
            </div>  </div>
        </div>
      </section>

      {/* Fintech Engine Section */}
      <PremiumFintechSection />

      {/* Footer */}
      <footer className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center border-t border-dark-border/20 text-xs font-semibold text-dark-muted">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-auto" />
            <span className="text-dark-text tracking-wider uppercase">YouCollab</span>
          </div>
          <p className="opacity-80">© 2026 YouCollab by Social Kurry. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
