import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, MapPin, Search, Calendar, ChevronRight } from 'lucide-react';
import { useApplications } from '../../hooks/useApplications';
import { formatBudget, formatDate } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';

export const MyApplications = () => {
  const [filter, setFilter] = useState('ALL');
  const { useMyApplications } = useApplications();
  const { data: response, isLoading } = useMyApplications();
  
  const applications = response?.data || [];

  const filteredApps = filter === 'ALL' 
    ? applications 
    : applications.filter(app => app.status === filter);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED': return <Badge variant="success">Accepted</Badge>;
      case 'REJECTED': return <Badge variant="error">Declined</Badge>;
      case 'PENDING': return <Badge variant="warning">Pending Review</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-dark-text">My Applications</h1>
          <p className="text-neutral-500 dark:text-dark-muted mt-1">
            Track the status of pitches you've sent to brands.
          </p>
        </div>
        <Button to="/gigs" className="flex items-center gap-2">
          <Search size={18} />
          Find More Gigs
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2 border-b border-neutral-200 dark:border-dark-border">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'PENDING', label: 'Pending' },
          { id: 'ACCEPTED', label: 'Accepted' },
          { id: 'REJECTED', label: 'Declined' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              filter === tab.id 
                ? 'border-primary text-primary bg-primary/5 dark:bg-primary/10' 
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 dark:text-dark-muted dark:hover:text-dark-text dark:hover:bg-dark-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} variant="rect" className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredApps.length > 0 ? (
        <div className="space-y-4">
          {filteredApps.map((app) => (
            <Card key={app.id} className="p-0 overflow-hidden hover:shadow-premium-hover transition-all group">
              <Link to={`/gigs/${app.gigId}`} className="flex flex-col md:flex-row h-full">
                {/* Brand Details side */}
                <div className="md:w-1/3 bg-neutral-50/50 dark:bg-dark-surface/30 p-5 border-b md:border-b-0 md:border-r border-neutral-100 dark:border-dark-border flex items-center gap-4">
                  <Avatar 
                    src={app.gig?.brand?.logoUrl} 
                    name={app.gig?.brand?.businessName || 'B'} 
                    size="md" 
                    className="shadow-sm"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-neutral-900 dark:text-dark-text truncate">{app.gig?.brand?.businessName}</h4>
                    <p className="text-xs text-neutral-500 dark:text-dark-muted flex items-center gap-1 mt-1 truncate">
                      <MapPin size={10} /> {app.gig?.city}
                    </p>
                  </div>
                </div>

                {/* Gig & Application Details */}
                <div className="p-5 flex-1 flex flex-col justify-center relative">
                  <div className="flex justify-between items-start mb-2 pr-8">
                    <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors dark:text-dark-text">
                      {app.gig?.title}
                    </h3>
                    <div className="shrink-0 absolute right-5 top-5">
                      {getStatusBadge(app.status)}
                    </div>
                  </div>
                  
                  <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
                    {formatBudget(app.gig?.budgetMin, app.gig?.budgetMax)}
                  </div>
                  
                  <div className="flex items-center text-xs text-neutral-500 dark:text-dark-muted">
                    <Calendar size={12} className="mr-1.5" />
                    Applied on {formatDate(app.createdAt)}
                  </div>

                  <div className="absolute right-5 bottom-1/2 translate-y-1/2 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all text-primary hidden md:block">
                    <ChevronRight size={24} />
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 border-dashed">
          <EmptyState
            icon={<FileText size={48} className="text-neutral-300" />}
            title="No applications found"
            description={
              filter === 'ALL' 
                ? "You haven't pitched to any campaigns yet. Browse open gigs and send your first application!" 
                : `You don't have any ${filter.toLowerCase()} applications right now.`
            }
            action={filter === 'ALL' && <Button to="/gigs">Browse Local Gigs</Button>}
          />
        </Card>
      )}
    </div>
  );
};

export default MyApplications;
