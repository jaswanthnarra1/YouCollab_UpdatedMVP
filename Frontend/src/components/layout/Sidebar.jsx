import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  PlusCircle, 
  Search, 
  FileText, 
  Bell, 
  LogOut, 
  Sparkles, 
  X,
  Compass,
  User,
  Settings
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useUiStore from '../../stores/uiStore';
import { cn } from '../../utils';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import Logo from '../ui/Logo';

export const Sidebar = () => {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const navigate = useNavigate();
  const [showPromo, setShowPromo] = useState(true);

  if (!user) return null;

  const brandLinks = [
    { to: '/dashboard/brand', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/gigs/create', label: 'Post Collab', icon: PlusCircle },
    { to: '/gigs/mine', label: 'My Collabs', icon: Briefcase },
    { to: '/gigs', label: 'Explore Feed', icon: Compass },
  ];

  const creatorLinks = [
    { to: '/dashboard/influencer', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/gigs', label: 'Find Collabs', icon: Compass },
    { to: '/applications', label: 'My Pitches', icon: FileText },
  ];

  const links = user.role === 'BRAND' ? brandLinks : creatorLinks;
  const displayName = user?.brand?.businessName || user?.influencer?.name || 'My Profile';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen border-r border-dark-border bg-dark-sidebar transition-all duration-300 sticky top-0 shrink-0 z-30 select-none text-left sidebar-scroll overflow-y-auto',
        sidebarOpen ? 'w-64 px-4 py-5' : 'w-20 px-2.5 py-5'
      )}
    >
      {/* Sidebar Header: Brand Name + User Avatar */}
      <div className="flex items-center justify-between px-2 mb-6">
        <Link 
          to={user?.role === 'BRAND' ? '/dashboard/brand' : '/dashboard/influencer'}
          className="flex items-center gap-3 hover:opacity-85 transition-opacity"
        >
          <Logo transparent={true} className="h-10 w-auto" />
          {sidebarOpen && (
            <span className="font-extrabold text-sm tracking-wider text-white uppercase leading-none">
              YouCollab
            </span>
          )}
        </Link>

        {sidebarOpen && (
          <button 
            onClick={() => navigate(user.role === 'BRAND' ? '/dashboard/brand' : '/dashboard/influencer')}
            className="hover:opacity-80 transition-opacity"
          >
            <Avatar src={user?.avatarUrl} name={displayName} size="xs" className="border-none" />
          </button>
        )}
      </div>

      {/* Styled Inline Search box inside sidebar */}
      {sidebarOpen ? (
        <div className="px-2 mb-6">
          <div className="relative flex items-center rounded-xl bg-dark-bg border border-dark-border px-3.5 py-2.5 text-dark-muted focus-within:border-white/20 focus-within:text-dark-text transition-all duration-200">
            <Search size={14} className="shrink-0 mr-2.5" />
            <input 
              type="text" 
              placeholder="Search workspaces..." 
              className="bg-transparent text-xs w-full focus:outline-none border-none p-0 focus:ring-0 text-dark-text placeholder-dark-muted"
              onClick={() => navigate('/gigs')}
              readOnly
            />
          </div>
        </div>
      ) : (
        <div className="flex justify-center mb-6">
          <button 
            onClick={() => navigate('/gigs')}
            className="h-10 w-10 rounded-xl bg-dark-bg border border-dark-border flex items-center justify-center text-dark-muted hover:text-dark-text transition-colors"
          >
            <Search size={16} />
          </button>
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 px-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all relative',
                  isActive
                    ? 'bg-[#121212] text-[#3FE3FF] border border-white/[0.08]'
                    : 'text-dark-muted hover:bg-[#111111] hover:text-dark-text'
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span className="truncate leading-none">{link.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Promo CTA Card (Upgrade to Pro style from reference) */}
      {sidebarOpen && showPromo && (
        <div className="mt-auto mx-1 mb-6 p-4 rounded-2xl bg-[#0A0A0A] border border-dark-border relative overflow-hidden">
          <button 
            onClick={() => setShowPromo(false)}
            className="absolute top-3 right-3 text-dark-muted hover:text-dark-text transition-colors"
          >
            <X size={14} />
          </button>
          
          <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white mb-3">
            <Sparkles size={16} />
          </div>
          
          <h4 className="text-xs font-bold text-dark-text">Boost Collabs!</h4>
          <p className="text-[11px] text-dark-muted mt-1 leading-relaxed">
            Invite friends to gain instant premium tier badges and double your outreach limits.
          </p>
          
          <button 
            onClick={() => navigate('/gigs')}
            className="mt-3 w-full py-1.5 rounded-lg bg-[#111111] border border-dark-border hover:border-white/15 text-xs font-bold text-dark-text hover:bg-[#161616] transition-all text-center block"
          >
            Invite Friends
          </button>
        </div>
      )}

      {/* Sidebar Footer User controls */}
      <div className="pt-4 border-t border-dark-border/60 mt-auto px-1 space-y-1">
        {sidebarOpen ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-dark-surface/30 border border-dark-border/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar src={user?.avatarUrl} name={displayName} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-dark-text truncate leading-none">
                  {displayName}
                </p>
                <p className="text-[10px] text-dark-muted truncate mt-1 leading-none">
                  {user.role}
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-dark-muted hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/20 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Avatar src={user?.avatarUrl} name={displayName} size="sm" className="border-none" />
            <button 
              onClick={handleLogout}
              className="text-dark-muted hover:text-rose-400 p-2 rounded-xl hover:bg-rose-950/20 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
