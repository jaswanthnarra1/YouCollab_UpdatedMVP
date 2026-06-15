import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Send, CheckCircle, Clock, ArrowRight, LayoutTemplate } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useApplications } from '../../hooks/useApplications';
import { formatDate, cn } from '../../utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import InstagramConnectCard from '../../components/profile/InstagramConnectCard';

export const InfluencerDashboard = () => {
  const { user } = useAuthStore();
  const { useMyApplications } = useApplications();
  const { data: appsResponse, isLoading } = useMyApplications();
  const navigate = useNavigate();
  
  const applications = appsResponse?.data || [];
  
  // Calculate stats
  const totalSent = applications.length;
  const accepted = applications.filter(app => app.status === 'ACCEPTED').length;
  const pending = applications.filter(app => app.status === 'PENDING').length;
  
  const recentApps = applications.slice(0, 4); // Get 4 most recent

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED': return <Badge variant="success">Accepted</Badge>;
      case 'REJECTED': return <Badge variant="danger">Declined</Badge>;
      case 'PENDING': return <Badge variant="warning">Pending</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-dark-text tracking-tight">
            Hello, {user?.influencer?.name || 'Creator'} ✨
          </h1>
          <p className="text-dark-muted mt-1 text-sm font-medium">
            Here's what's happening with your collaborations.
          </p>
        </div>
        <Button to="/gigs" className="flex items-center gap-2" variant="primary">
          <Search size={18} />
          Browse Gigs
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Pitches Sent (Vertical bar chart sparkline) */}
        <Card hoverable className="p-6 relative overflow-hidden group">
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Pitches Sent</p>
                <h3 className="text-3xl font-extrabold mt-2 text-white tracking-tight">
                  {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : totalSent}
                </h3>
              </div>
              <div className="p-2.5 bg-white/5 border border-white/8 rounded-xl text-white">
                <Send size={20} />
              </div>
            </div>

            {/* Sparkline Bar Chart */}
            <div className="flex items-end gap-[3px] h-10 w-full opacity-80 pt-2">
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[20%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[35%]" />
              <div className="w-full bg-primary rounded-sm h-[60%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[40%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[50%]" />
              <div className="w-full bg-primary rounded-sm h-[80%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[30%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[45%]" />
              <div className="w-full bg-primary rounded-sm h-[90%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[55%]" />
              <div className="w-full bg-[#1E1E1E] rounded-sm h-[25%]" />
              <div className="w-full bg-primary rounded-sm h-[75%]" />
            </div>
          </div>
        </Card>
        
        {/* Card 2: Accepted (Horizontal progress bars) */}
        <Card hoverable className="p-6 relative overflow-hidden group">
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Accepted</p>
                <h3 className="text-3xl font-extrabold mt-2 text-white tracking-tight">
                  {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : accepted}
                </h3>
              </div>
              <div className="p-2.5 bg-white/5 border border-white/8 rounded-xl text-white">
                <CheckCircle size={20} />
              </div>
            </div>

            {/* Segmented Horizontal Progress Track */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">
                <span>Success Rate</span>
                <span className="text-white">50%</span>
              </div>
              <div className="flex gap-[2.5px] h-2.5 w-full bg-[#050505] rounded-md overflow-hidden p-[1.5px] border border-white/5">
                {Array.from({ length: 24 }).map((_, i) => {
                  const isActive = i < 12; // 50%
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

        {/* Card 3: Pending Review (Line Sparkline SVG) */}
        <Card hoverable className="p-6 relative overflow-hidden group">
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Pending Review</p>
                <h3 className="text-3xl font-extrabold mt-2 text-white tracking-tight">
                  {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : pending}
                </h3>
              </div>
              <div className="p-2.5 bg-white/5 border border-white/8 rounded-xl text-white">
                <Clock size={20} />
              </div>
            </div>

            {/* Sparkline Line chart SVG */}
            <div className="h-10 w-full pt-1">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3FE3FF" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#3FE3FF" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path 
                  d="M0 20 C 20 28, 40 5, 60 18 C 80 30, 90 2, 100 5 L 100 30 Z" 
                  fill="url(#pendingGrad)" 
                />
                <path 
                  d="M0 20 C 20 28, 40 5, 60 18 C 80 30, 90 2, 100 5" 
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

      {/* Instagram Connect Card */}
      <InstagramConnectCard />

      {/* Recent Applications Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-dark-text tracking-tight">Recent Pitches</h2>
          {applications.length > 0 && (
            <Button to="/applications" variant="ghost" size="sm" className="flex items-center gap-1 text-xs">
              View All <ArrowRight size={14} />
            </Button>
          )}
        </div>

        {isLoading ? (
          <Card className="divide-y divide-dark-border/40">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 flex items-center gap-4">
                <Skeleton variant="avatar" className="w-12 h-12" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            ))}
          </Card>
        ) : recentApps.length > 0 ? (
          <Card className="overflow-hidden p-0">
            <div className="divide-y divide-dark-border/40">
              {recentApps.map((app) => (
                <div key={app.id} className="p-4 sm:p-5 hover:bg-dark-bg/40 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar 
                      src={app.gig?.brand?.logoUrl} 
                      name={app.gig?.brand?.businessName || 'B'} 
                      size="md" 
                    />
                    <div className="min-w-0 flex-1">
                      <Link to={`/gigs/${app.gigId}`} className="font-bold text-sm sm:text-base hover:text-primary transition-colors truncate block text-dark-text leading-tight">
                        {app.gig?.title || 'Unknown Gig'}
                      </Link>
                      <p className="text-xs text-dark-muted truncate mt-1">
                        {app.gig?.brand?.businessName} • Applied {formatDate(app.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
                    {getStatusBadge(app.status)}
                    <Link to={`/gigs/${app.gigId}`} className="text-xs font-bold text-primary hover:underline">
                      View Gig
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={<LayoutTemplate size={32} />}
            title="No pitches sent yet"
            description="Find your next collab and send your first pitch to a brand."
            actionText="Browse Local Gigs"
            onAction={() => navigate('/gigs')}
          />
        )}
      </div>
    </div>
  );
};

export default InfluencerDashboard;
