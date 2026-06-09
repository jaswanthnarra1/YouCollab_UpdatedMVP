import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Briefcase, FileText, User } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { ThemeToggle } from '../ui/ThemeToggle';
import { NotificationBell } from '../notifications/NotificationBell';
import { Logo } from '../ui/Logo';

export const Navbar = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
  };

  const displayName = user?.brand?.businessName || user?.influencer?.name || 'My Profile';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/80 backdrop-blur-md dark:border-dark-border dark:bg-dark-bg/80 select-none">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand/Logo Logo */}
        <Link to="/" className="flex items-center gap-2 select-none">
          <Logo className="h-9 w-auto drop-shadow-md" />
          <span className="hidden sm:inline-block rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary dark:bg-primary/20 uppercase tracking-widest">
            YOU-COLLAB
          </span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <NotificationBell />

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 focus:outline-none transition-all active:scale-[0.98]"
              >
                <Avatar src={user?.avatarUrl} name={displayName} size="sm" />
                <span className="hidden md:inline-block text-sm font-semibold text-neutral-700 hover:text-neutral-900 dark:text-dark-text dark:hover:text-dark-muted">
                  {displayName}
                </span>
              </button>

              {dropdownOpen && (
                <>
                  {/* Backdrop clicking mask */}
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  
                  {/* Dropdown Options */}
                  <div className="absolute right-0 mt-2.5 w-52 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-dark-border dark:bg-dark-surface animate-fade-in z-20">
                    <div className="px-3 py-2 border-b border-neutral-100 dark:border-dark-border mb-1 text-left select-none">
                      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider dark:text-dark-muted">
                        Role: {user?.role}
                      </div>
                      <div className="text-[13px] font-bold text-neutral-900 truncate dark:text-dark-text">
                        {user?.email}
                      </div>
                    </div>

                    <Link
                      to={user?.role === 'BRAND' ? '/dashboard/brand' : '/dashboard/influencer'}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm text-neutral-600 hover:bg-neutral-50 dark:text-dark-text dark:hover:bg-dark-bg/60 transition-colors"
                    >
                      <LayoutDashboard size={16} />
                      Dashboard
                    </Link>

                    <Link
                      to={user?.role === 'BRAND' ? '/gigs/mine' : '/applications'}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm text-neutral-600 hover:bg-neutral-50 dark:text-dark-text dark:hover:bg-dark-bg/60 transition-colors"
                    >
                      {user?.role === 'BRAND' ? <Briefcase size={16} /> : <FileText size={16} />}
                      {user?.role === 'BRAND' ? 'My Collabs' : 'My Applications'}
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors dark:text-dark-muted dark:hover:text-dark-text px-3 py-2"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center text-sm font-semibold bg-primary text-white hover:bg-primary-hover px-4 py-2.5 rounded-xl shadow-sm shadow-primary/20 transition-all select-none active:scale-[0.98]"
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
