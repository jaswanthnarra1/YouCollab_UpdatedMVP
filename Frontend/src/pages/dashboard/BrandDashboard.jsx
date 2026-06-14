import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Activity, Users, Eye, ArrowRight, FileText } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useGigs } from '../../hooks/useGigs';
import { formatDate, cn } from '../../utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

export const BrandDashboard = () => {
  const { user } = useAuthStore();
  const { useMyGigs } = useGigs();
  const { data: gigsResponse, isLoading } = useMyGigs();
  const navigate = useNavigate();
  
  const gigs = gigsResponse?.data || [];
  
  // Calculate stats
  const totalGigs = gigs.length;
  const activeApplications = gigs.reduce((acc, gig) => acc + (gig._count?.applications || 0), 0);
  const totalViews = gigs.reduce((acc, gig) => acc + (gig.viewCount || 0), 0);
  
  const recentGigs = gigs.slice(0, 3); // Get 3 most recent

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN': return <Badge variant="success">Active</Badge>;
      case 'CLOSED': return <Badge variant="neutral">Closed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-dark-text tracking-tight">
            Welcome back, {user?.brand?.businessName || 'Brand'} 👋
          </h1>
          <p className="text-dark-muted mt-1 text-sm font-medium">
            Manage your collaborations and find top Pune creators.
          </p>
        </div>
        <Button to="/gigs/create" className="flex items-center gap-2" variant="primary">
          <PlusCircle size={18} />
          Post New Collab
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Collabs (Vertical Bar sparklines matching reference) */}
        <Card hoverable className="p-6 relative overflow-hidden group">
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Total Collabs</p>
                <h3 className="text-3xl font-extrabold mt-2 text-white tracking-tight">
                  {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : totalGigs}
                </h3>
              </div>
              <div className="p-2.5 bg-white/5 border border-white/8 rounded-xl text-white">
                <Activity size={20} />
              </div>
            </div>

            {/* Sparkline Bar Chart (Vertical Bars) */}
            <div className="flex items-end gap-[3px] h-10 w-full opacity-80 pt-2">
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[30%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[45%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[25%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[60%]" />
              <div className="w-full bg-primary rounded-sm h-[75%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[50%]" />
              <div className="w-full bg-primary rounded-sm h-[85%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[40%]" />
              <div className="w-full bg-primary rounded-sm h-[95%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[55%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[35%]" />
              <div className="w-full bg-primary rounded-sm h-[65%]" />
            </div>
          </div>
        </Card>
        
        {/* Card 2: Applications (Horizontal Progress Bar matching reference) */}
        <Card hoverable className="p-6 relative overflow-hidden group">
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Applications</p>
                <h3 className="text-3xl font-extrabold mt-2 text-white tracking-tight">
                  {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : activeApplications}
                </h3>
              </div>
              <div className="p-2.5 bg-white/5 border border-white/8 rounded-xl text-white">
                <Users size={20} />
              </div>
            </div>

            {/* Segmented Horizontal Progress Track */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">
                <span>Progress Rate</span>
                <span className="text-white">70%</span>
              </div>
              <div className="flex gap-[2.5px] h-2.5 w-full bg-[#050505] rounded-md overflow-hidden p-[1.5px] border border-white/5">
                {Array.from({ length: 24 }).map((_, i) => {
                  const isActive = i < 17; // 70%
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "w-full h-full rounded-[1px] transition-colors",
                        isActive ? "bg-primary" : "bg-[#1E1E1E]"
                      )} 
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Card 3: Total Views (Line Chart Sparkline matching reference) */}
        <Card hoverable className="p-6 relative overflow-hidden group">
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Total Views</p>
                <h3 className="text-3xl font-extrabold mt-2 text-white tracking-tight">
                  {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : totalViews}
                </h3>
              </div>
              <div className="p-2.5 bg-white/5 border border-white/8 rounded-xl text-white">
                <Eye size={20} />
              </div>
            </div>

            {/* Smooth Line Sparkline SVG */}
            <div className="h-10 w-full pt-1">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3FE3FF" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#3FE3FF" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area under line */}
                <path 
                  d="M0 30 C 15 25, 30 10, 45 15 C 60 20, 75 5, 90 8 L 100 8 L 100 30 Z" 
                  fill="url(#viewsGrad)" 
                />
                {/* Smooth flat line (No drop-shadow/glow) */}
                <path 
                  d="M0 30 C 15 25, 30 10, 45 15 C 60 20, 75 5, 90 8 L 100 8" 
                  fill="none" 
                  stroke="#3FE3FF" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Gigs Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-dark-text tracking-tight">Recent Collabs</h2>
          {gigs.length > 0 && (
            <Button to="/gigs/mine" variant="ghost" size="sm" className="flex items-center gap-1 text-xs">
              View All <ArrowRight size={14} />
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton variant="rect" className="h-48 rounded-2xl" />
            <Skeleton variant="rect" className="h-48 rounded-2xl" />
            <Skeleton variant="rect" className="h-48 rounded-2xl" />
          </div>
        ) : recentGigs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentGigs.map((gig) => (
              <Card key={gig.id} className="flex flex-col h-full hover:shadow-premium-hover transition-all duration-300">
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    {getStatusBadge(gig.status)}
                    <span className="text-xs font-bold bg-dark-bg text-dark-muted px-2 py-1 rounded-md border border-dark-border/40">
                      {gig.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-base mb-2 line-clamp-2 text-dark-text group-hover:text-primary transition-colors leading-snug">{gig.title}</h3>
                  <div className="mt-auto pt-4 space-y-2.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-dark-muted flex items-center gap-1.5">
                        <Users size={13} /> Applicants
                      </span>
                      <span className="text-dark-text">{gig._count?.applications || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-dark-muted">Deadline</span>
                      <span className="text-dark-text">{formatDate(gig.deadline)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-3.5 border-t border-dark-border bg-dark-surface/30 rounded-b-2xl">
                  <Button to={`/gigs/${gig.id}/applicants`} variant="outline" className="w-full text-xs py-2">
                    Review Applicants
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText size={32} />}
            title="No collabs posted yet"
            description="Create your first gig to start receiving pitches from Pune creators."
            actionText="Post a Collab"
            onAction={() => navigate('/gigs/create')}
          />
        )}
      </div>
    </div>
  );
};

export default BrandDashboard;
