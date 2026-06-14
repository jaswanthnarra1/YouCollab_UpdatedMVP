import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Briefcase, FileText, Settings, Bell, Search } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { NotificationBell } from '../notifications/NotificationBell';

export const Navbar = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/login');
  };

  const displayName = user?.brand?.businessName || user?.influencer?.name || 'My Profile';

  // Compute breadcrumbs based on the active path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path.includes('/dashboard/brand')) return { parent: 'Workspace', current: 'Overview' };
    if (path.includes('/dashboard/influencer')) return { parent: 'Workspace', current: 'Overview' };
    if (path.includes('/gigs/create')) return { parent: 'Collabs', current: 'Post a Campaign' };
    if (path.includes('/gigs/mine')) return { parent: 'Collabs', current: 'My Postings' };
    if (path.includes('/gigs/')) return { parent: 'Collabs', current: 'Campaign Details' };
    if (path.includes('/gigs')) return { parent: 'Collabs', current: 'Explore Feed' };
    if (path.includes('/applications')) return { parent: 'Workspace', current: 'My Pitches' };
    if (path.includes('/onboarding')) return { parent: 'Account', current: 'Onboarding' };
    return { parent: 'YouCollab', current: 'Home' };
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="w-full border-b border-dark-border/40 bg-dark-bg/60 backdrop-blur-md select-none py-3 px-6 sm:px-8 relative z-30">
      <div className="w-full flex items-center justify-between h-11">
        
        {/* Breadcrumbs Left (matches reference image: "Project / Finance Dashboard") */}
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="text-dark-muted hover:text-dark-text cursor-pointer transition-colors">
            {breadcrumbs.parent}
          </span>
          <span className="text-dark-muted/40">/</span>
          <span className="text-dark-text">
            {breadcrumbs.current}
          </span>
        </div>

        {/* Action Controls Right (matches reference image: Search, Bell, Avatar dropdown) */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {/* Notifications */}
              <NotificationBell />

              {/* Quick Settings Icon */}
              <button 
                onClick={() => navigate(user?.role === 'BRAND' ? '/dashboard/brand' : '/dashboard/influencer')}
                className="text-dark-muted hover:text-dark-text transition-colors p-1.5 rounded-lg hover:bg-dark-hover"
                title="Settings"
              >
                <Settings size={18} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 focus:outline-none transition-all active:scale-[0.98] p-1 rounded-lg hover:bg-dark-hover"
                >
                  <Avatar src={user?.avatarUrl} name={displayName} size="sm" className="border border-dark-border/40" />
                  <span className="hidden md:inline-block text-xs font-bold text-dark-text hover:text-primary transition-colors">
                    {displayName}
                  </span>
                </button>

                {dropdownOpen && (
                  <>
                    {/* Backdrop click mask */}
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    
                    {/* Dropdown Options */}
                    <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-dark-border bg-dark-surface p-2 shadow-premium animate-fade-in z-20">
                      <div className="px-3 py-2 border-b border-dark-border mb-1 text-left select-none">
                        <div className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">
                          Role: {user?.role}
                        </div>
                        <div className="text-[12px] font-bold text-dark-text truncate mt-0.5">
                          {user?.email}
                        </div>
                      </div>

                      <Link
                        to={user?.role === 'BRAND' ? '/dashboard/brand' : '/dashboard/influencer'}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-dark-text hover:bg-dark-hover transition-colors"
                      >
                        <LayoutDashboard size={14} className="text-primary" />
                        Dashboard
                      </Link>

                      <Link
                        to={user?.role === 'BRAND' ? '/gigs/mine' : '/applications'}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-dark-text hover:bg-dark-hover transition-colors"
                      >
                        {user?.role === 'BRAND' ? <Briefcase size={14} className="text-primary" /> : <FileText size={14} className="text-primary" />}
                        {user?.role === 'BRAND' ? 'My Collabs' : 'My Applications'}
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-rose-400 hover:bg-rose-950/20 transition-colors"
                      >
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-bold text-dark-muted hover:text-dark-text transition-colors px-3 py-2"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center text-xs font-bold bg-primary text-dark-deeper hover:bg-primary-hover px-4 py-2 rounded-xl shadow-premium hover:shadow-glow transition-all active:scale-[0.98]"
              >
                Join Now
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
