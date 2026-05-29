import React from 'react';
import { PlusCircle, Activity, Users, Eye, ArrowRight, FileText } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useGigs } from '../../hooks/useGigs';
import { formatDate } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

export const BrandDashboard = () => {
  const { user } = useAuthStore();
  const { useMyGigs } = useGigs();
  const { data: gigsResponse, isLoading } = useMyGigs();
  
  const gigs = gigsResponse?.data || [];
  
  // Calculate stats
  const totalGigs = gigs.length;
  const activeApplications = gigs.reduce((acc, gig) => acc + (gig._count?.applications || 0), 0);
  const totalViews = gigs.reduce((acc, gig) => acc + (gig.viewCount || 0), 0);
  
  const recentGigs = gigs.slice(0, 3); // Get 3 most recent

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN': return <Badge variant="success">Active</Badge>;
      case 'CLOSED': return <Badge variant="default">Closed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-dark-text">
            Welcome back, {user?.brand?.businessName || 'Brand'} 👋
          </h1>
          <p className="text-neutral-500 dark:text-dark-muted mt-1">
            Manage your collaborations and find top Pune creators.
          </p>
        </div>
        <Button to="/gigs/create" className="flex items-center gap-2">
          <PlusCircle size={18} />
          Post New Collab
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-primary flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-dark-muted">Total Collabs</p>
            <h3 className="text-3xl font-bold mt-1 dark:text-dark-text">
              {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : totalGigs}
            </h3>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Activity size={24} />
          </div>
        </Card>
        
        <Card className="p-6 border-l-4 border-l-secondary flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-dark-muted">Applications</p>
            <h3 className="text-3xl font-bold mt-1 dark:text-dark-text">
              {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : activeApplications}
            </h3>
          </div>
          <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
            <Users size={24} />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-accent flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-dark-muted">Total Views</p>
            <h3 className="text-3xl font-bold mt-1 dark:text-dark-text">
              {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : totalViews}
            </h3>
          </div>
          <div className="p-3 bg-accent/10 rounded-xl text-accent">
            <Eye size={24} />
          </div>
        </Card>
      </div>

      {/* Recent Gigs Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold dark:text-dark-text">Recent Collabs</h2>
          {gigs.length > 0 && (
            <Button to="/gigs/mine" variant="ghost" size="sm" className="flex items-center gap-1">
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
              <Card key={gig.id} className="flex flex-col h-full hover:shadow-premium-hover transition-all">
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    {getStatusBadge(gig.status)}
                    <span className="text-xs font-medium text-neutral-400 bg-neutral-100 dark:bg-dark-bg dark:text-dark-muted px-2 py-1 rounded-md">
                      {gig.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-2 line-clamp-2 dark:text-dark-text">{gig.title}</h3>
                  <div className="mt-auto pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500 dark:text-dark-muted flex items-center gap-1.5">
                        <Users size={14} /> Applicants
                      </span>
                      <span className="font-semibold dark:text-dark-text">{gig._count?.applications || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500 dark:text-dark-muted">Deadline</span>
                      <span className="font-semibold dark:text-dark-text">{formatDate(gig.deadline)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-neutral-100 dark:border-dark-border bg-neutral-50/50 dark:bg-dark-surface/50 rounded-b-2xl">
                  <Button to={`/gigs/${gig.id}/applicants`} variant="outline" className="w-full text-sm py-2">
                    Review Applicants
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText size={32} className="text-neutral-400" />}
            title="No collabs posted yet"
            description="Create your first gig to start receiving pitches from Pune creators."
            action={<Button to="/gigs/create">Post a Collab</Button>}
          />
        )}
      </div>
    </div>
  );
};

export default BrandDashboard;
