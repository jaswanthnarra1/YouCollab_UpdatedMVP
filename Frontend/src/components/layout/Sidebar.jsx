import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, PlusCircle, Search, FileText } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useUiStore from '../../stores/uiStore';
import { cn } from '../../lib/utils';

export const Sidebar = () => {
  const { user } = useAuthStore();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);

  if (!user) return null;

  const brandLinks = [
    { to: '/dashboard/brand', label: 'Overview', icon: LayoutDashboard },
    { to: '/gigs/create', label: 'Post a Collab 🚀', icon: PlusCircle },
    { to: '/gigs/mine', label: 'My Collabs', icon: Briefcase },
    { to: '/gigs', label: 'Browse Feed', icon: Search },
  ];

  const creatorLinks = [
    { to: '/dashboard/influencer', label: 'Overview', icon: LayoutDashboard },
    { to: '/gigs', label: 'Find Collabs', icon: Search },
    { to: '/applications', label: 'My Applications', icon: FileText },
  ];

  const links = user.role === 'BRAND' ? brandLinks : creatorLinks;

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-[calc(100vh-64px)] border-r border-neutral-200 bg-white transition-all duration-300 dark:border-dark-border dark:bg-dark-bg sticky top-16 shrink-0 z-30 select-none text-left',
        sidebarOpen ? 'w-64 px-4' : 'w-20 px-2'
      )}
    >
      <nav className="flex-1 py-6 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all relative',
                  isActive
                    ? 'bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary-light border-l-4 border-primary pl-[13px] rounded-l-none'
                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-dark-muted dark:hover:bg-dark-surface dark:hover:text-dark-text'
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span className="truncate leading-none">{link.label}</span>}
            </NavLink>
          );
        })}
      </nav>
      
      {/* Sidebar Footer info */}
      {sidebarOpen && (
        <div className="p-4 border-t border-neutral-100 dark:border-dark-border mb-4 text-left select-none">
          <div className="text-[10px] font-bold text-neutral-400 dark:text-dark-muted uppercase tracking-widest leading-none">
            Active Niche
          </div>
          <div className="text-xs font-bold text-neutral-700 dark:text-dark-text truncate mt-1">
            {user.role === 'BRAND' ? user.brand?.category : user.influencer?.niche}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
