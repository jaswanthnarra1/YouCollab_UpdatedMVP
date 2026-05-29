import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Send, CheckCircle, Clock, ArrowRight, FileText, LayoutTemplate } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useApplications } from '../../hooks/useApplications';
import { formatDate } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';

export const InfluencerDashboard = () => {
  const { user } = useAuthStore();
  const { useMyApplications } = useApplications();
  const { data: appsResponse, isLoading } = useMyApplications();
  
  const applications = appsResponse?.data || [];
  
  // Calculate stats
  const totalSent = applications.length;
  const accepted = applications.filter(app => app.status === 'ACCEPTED').length;
  const pending = applications.filter(app => app.status === 'PENDING').length;
  
  const recentApps = applications.slice(0, 4); // Get 4 most recent

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED': return <Badge variant="success">Accepted</Badge>;
      case 'REJECTED': return <Badge variant="error">Declined</Badge>;
      case 'PENDING': return <Badge variant="warning">Pending</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-dark-text">
            Hello, {user?.influencer?.name || 'Creator'} ✨
          </h1>
          <p className="text-neutral-500 dark:text-dark-muted mt-1">
            Here's what's happening with your collaborations.
          </p>
        </div>
        <Button to="/gigs" className="flex items-center gap-2">
          <Search size={18} />
          Browse Gigs
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-primary flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-dark-muted">Pitches Sent</p>
            <h3 className="text-3xl font-bold mt-1 dark:text-dark-text">
              {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : totalSent}
            </h3>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Send size={24} />
          </div>
        </Card>
        
        <Card className="p-6 border-l-4 border-l-success flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-dark-muted">Accepted</p>
            <h3 className="text-3xl font-bold mt-1 dark:text-dark-text">
              {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : accepted}
            </h3>
          </div>
          <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
            <CheckCircle size={24} />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-warning flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-dark-muted">Pending Review</p>
            <h3 className="text-3xl font-bold mt-1 dark:text-dark-text">
              {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : pending}
            </h3>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
            <Clock size={24} />
          </div>
        </Card>
      </div>

      {/* Recent Applications Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold dark:text-dark-text">Recent Pitches</h2>
          {applications.length > 0 && (
            <Button to="/applications" variant="ghost" size="sm" className="flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Button>
          )}
        </div>

        {isLoading ? (
          <Card className="divide-y divide-neutral-100 dark:divide-dark-border">
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
          <Card className="overflow-hidden">
            <div className="divide-y divide-neutral-100 dark:divide-dark-border">
              {recentApps.map((app) => (
                <div key={app.id} className="p-4 sm:p-5 hover:bg-neutral-50 dark:hover:bg-dark-surface/50 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar 
                      src={app.gig?.brand?.logoUrl} 
                      name={app.gig?.brand?.businessName || 'B'} 
                      size="md" 
                    />
                    <div className="min-w-0 flex-1">
                      <Link to={`/gigs/${app.gigId}`} className="font-bold text-base hover:text-primary transition-colors truncate block dark:text-dark-text">
                        {app.gig?.title || 'Unknown Gig'}
                      </Link>
                      <p className="text-sm text-neutral-500 dark:text-dark-muted truncate mt-0.5">
                        {app.gig?.brand?.businessName} • Applied {formatDate(app.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
                    {getStatusBadge(app.status)}
                    <Link to={`/gigs/${app.gigId}`} className="text-sm font-medium text-primary hover:underline">
                      View Gig
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={<LayoutTemplate size={32} className="text-neutral-400" />}
            title="No pitches sent yet"
            description="Find your next collab and send your first pitch to a brand."
            action={<Button to="/gigs">Browse Local Gigs</Button>}
          />
        )}
      </div>
    </div>
  );
};

export default InfluencerDashboard;
