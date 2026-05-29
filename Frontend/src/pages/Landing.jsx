import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Star, ShieldCheck, Zap, Users } from 'lucide-react';
import Button from '../components/ui/Button';
import useAuthStore from '../stores/authStore';
import { Logo } from '../components/ui/Logo';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export const Landing = () => {
  const { isAuthenticated, user } = useAuthStore();

  const dashboardPath = user
    ? user.role === 'BRAND'
      ? '/dashboard/brand'
      : '/dashboard/influencer'
    : '/login';

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg text-neutral-900 dark:text-dark-text overflow-hidden transition-colors duration-200">
      {/* Navbar Stub */}
      <nav className="border-b border-neutral-100 dark:border-dark-border bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-auto drop-shadow-sm" />
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary dark:bg-primary/20 uppercase tracking-widest">
              YOU-COLLAB
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isAuthenticated ? (
              <Button to={dashboardPath} variant="primary" size="sm">
                Dashboard
              </Button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-neutral-600 dark:text-dark-muted hover:text-neutral-950 dark:hover:text-dark-text transition-colors">
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
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse duration-10000" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-secondary/15 rounded-full blur-[90px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 dark:bg-primary/10 border border-primary/20 text-xs font-bold text-primary dark:text-primary-light mb-6 animate-fade-in">
          <Sparkles size={14} />
          Pune's Premium Creator-Brand Hub
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]">
          Where Pune's Brands Meet{' '}
          <span className="">
            Top Creators
          </span>
        </h1>

        <p className="text-lg md:text-xl text-neutral-500 dark:text-dark-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Post local collabs, apply with beautiful pitches, secure budget rates, and execute campaign deals with Pune's aesthetic community.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Button to="/signup" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 group">
            Start Collaborating
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button to="/login" variant="outline" size="lg" className="w-full sm:w-auto">
            Explore Pune Gigs
          </Button>
        </div>

        {/* Local Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-neutral-100 dark:border-dark-border pt-12 text-left">
          <div>
            <div className="text-3xl font-extrabold text-primary mb-1">500+</div>
            <div className="text-sm font-semibold text-neutral-500 dark:text-dark-muted">Aesthetic Creators</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-secondary mb-1">80+</div>
            <div className="text-sm font-semibold text-neutral-500 dark:text-dark-muted">Pune Cafes & Brands</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-accent mb-1">₹12L+</div>
            <div className="text-sm font-semibold text-neutral-500 dark:text-dark-muted">Paid Collab Budgets</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-neutral-900 dark:text-dark-text mb-1">100%</div>
            <div className="text-sm font-semibold text-neutral-500 dark:text-dark-muted">Localized Campaign Focus</div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="bg-neutral-50 dark:bg-dark-surface/50 py-20 border-y border-neutral-100 dark:border-dark-border transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold mb-4">Crafted for local high-growth networking</h2>
            <p className="text-neutral-500 dark:text-dark-muted">We provide everything you need to source, negotiate, and launch high-impact Pune marketing campaigns.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white dark:bg-dark-surface border border-neutral-200/50 dark:border-dark-border shadow-premium hover:shadow-premium-hover transition-all">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Fast & Direct Matches</h3>
              <p className="text-neutral-500 dark:text-dark-muted text-sm leading-relaxed">
                Skip the agencies. Brands directly post clear campaign deliverables, and influencers pitch their specialized aesthetic niche.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-dark-surface border border-neutral-200/50 dark:border-dark-border shadow-premium hover:shadow-premium-hover transition-all">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary mb-6">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Verified Local Gigs</h3>
              <p className="text-neutral-500 dark:text-dark-muted text-sm leading-relaxed">
                Every gig is verified. Whether it's Koregaon Park cafés, Viman Nagar studios, or Kothrud boutiques, secure transparent budget payouts.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-dark-surface border border-neutral-200/50 dark:border-dark-border shadow-premium hover:shadow-premium-hover transition-all">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Community Hub</h3>
              <p className="text-neutral-500 dark:text-dark-muted text-sm leading-relaxed">
                Connect and pair program campaign reels with similar fashionistas, travelers, foodies, and tech bloggers based in Pune.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-neutral-100 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="h-7 w-auto" />
            <span className="text-xs text-neutral-400">© 2026. Made with 💜 in Pune.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-neutral-500 dark:text-dark-muted">
            <Link to="/login" className="hover:text-primary transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-primary transition-colors">Join Now</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
