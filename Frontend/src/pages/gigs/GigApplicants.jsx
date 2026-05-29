import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Check, X, Instagram, Users, User, ExternalLink, Calendar } from 'lucide-react';
import { useApplications } from '../../hooks/useApplications';
import { useGigs } from '../../hooks/useGigs';
import { formatDate } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';

export const GigApplicants = () => {
  const { id: gigId } = useParams();
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, ACCEPTED, REJECTED
  
  const { useGigApplicants, updateStatus, isUpdatingStatus } = useApplications();
  const { useGigDetail } = useGigs();
  
  const { data: gigResponse, isLoading: isLoadingGig } = useGigDetail(gigId);
  const { data: appsResponse, isLoading: isLoadingApps } = useGigApplicants(gigId);
  
  const gig = gigResponse?.data;
  const applications = appsResponse?.data || [];
  
  const filteredApps = filter === 'ALL' 
    ? applications 
    : applications.filter(app => app.status === filter);

  // Status handlers
  const handleAccept = (appId) => updateStatus({ id: appId, status: 'ACCEPTED' });
  const handleReject = (appId) => updateStatus({ id: appId, status: 'REJECTED' });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED': return <Badge variant="success">Accepted</Badge>;
      case 'REJECTED': return <Badge variant="error">Declined</Badge>;
      case 'PENDING': return <Badge variant="warning">Pending Review</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <Link to="/gigs/mine" className="inline-flex items-center text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:text-dark-muted dark:hover:text-dark-text mb-4 transition-colors group">
            <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to My Collabs
          </Link>
          
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-dark-text">
              {isLoadingGig ? <Skeleton className="h-9 w-64" /> : gig?.title}
            </h1>
            {!isLoadingGig && (
              <Badge variant={gig?.status === 'OPEN' ? 'success' : 'default'} className="uppercase">
                {gig?.status}
              </Badge>
            )}
          </div>
          <p className="text-neutral-500 dark:text-dark-muted mt-2 font-medium">
            Review and manage incoming pitches from creators.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Filter Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500 dark:text-dark-muted mb-3 px-2">Filter Status</h3>
            <div className="space-y-1">
              {[
                { id: 'ALL', label: 'All Applicants', count: applications.length },
                { id: 'PENDING', label: 'Pending Review', count: applications.filter(a => a.status === 'PENDING').length },
                { id: 'ACCEPTED', label: 'Accepted', count: applications.filter(a => a.status === 'ACCEPTED').length },
                { id: 'REJECTED', label: 'Declined', count: applications.filter(a => a.status === 'REJECTED').length },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    filter === item.id 
                      ? 'bg-primary/10 text-primary dark:bg-primary/20' 
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-dark-muted dark:hover:bg-dark-surface'
                  }`}
                >
                  {item.label}
                  <span className={`inline-flex items-center justify-center min-w-6 h-6 rounded-full text-xs ${
                    filter === item.id ? 'bg-primary/20' : 'bg-neutral-200 dark:bg-dark-border text-neutral-500'
                  }`}>
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Applicants List */}
        <div className="lg:col-span-3 space-y-4">
          {isLoadingApps ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} variant="rect" className="h-48 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredApps.length > 0 ? (
            <div className="space-y-4">
              {filteredApps.map((app) => (
                <Card key={app.id} className="p-0 overflow-hidden flex flex-col sm:flex-row">
                  {/* Creator Info Sidebar */}
                  <div className="sm:w-64 bg-neutral-50 dark:bg-dark-surface p-6 border-b sm:border-b-0 sm:border-r border-neutral-100 dark:border-dark-border flex flex-col items-center text-center">
                    <Avatar 
                      src={app.influencer?.profileImageUrl} 
                      name={app.influencer?.name} 
                      size="lg" 
                      className="w-20 h-20 mb-4 shadow-md ring-4 ring-white dark:ring-dark-bg" 
                    />
                    <h3 className="font-bold text-lg leading-tight dark:text-dark-text">{app.influencer?.name}</h3>
                    
                    <a 
                      href={`https://instagram.com/${app.influencer?.instagramHandle.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline text-sm font-semibold flex items-center gap-1 mt-1 mb-3"
                    >
                      <Instagram size={14} />
                      {app.influencer?.instagramHandle}
                    </a>
                    
                    <div className="flex flex-wrap justify-center gap-2 mt-auto w-full">
                      <div className="bg-white dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-lg px-3 py-1.5 w-full">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 block mb-0.5">Niche</span>
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{app.influencer?.niche}</span>
                      </div>
                      <div className="bg-white dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-lg px-3 py-1.5 w-full">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 block mb-0.5">Followers</span>
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          {app.influencer?.followerCount ? new Intl.NumberFormat('en-IN').format(app.influencer.followerCount) : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Application Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center text-xs font-semibold text-neutral-500 dark:text-dark-muted">
                        <Calendar size={14} className="mr-1.5" />
                        Applied {formatDate(app.createdAt)}
                      </div>
                      {getStatusBadge(app.status)}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-dark-text uppercase tracking-wider mb-2">The Pitch</h4>
                      <div className="bg-neutral-50/50 dark:bg-dark-bg p-4 rounded-xl border border-neutral-100 dark:border-dark-border/50 text-neutral-700 dark:text-neutral-300 text-sm whitespace-pre-wrap leading-relaxed shadow-inner">
                        {app.coverNote}
                      </div>
                    </div>

                    {/* Actions */}
                    {app.status === 'PENDING' && (
                      <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-dark-border flex gap-3 justify-end">
                        <Button 
                          variant="outlineDanger" 
                          onClick={() => handleReject(app.id)}
                          disabled={isUpdatingStatus}
                          className="flex items-center gap-1.5"
                        >
                          <X size={16} /> Decline
                        </Button>
                        <Button 
                          variant="primary" 
                          onClick={() => handleAccept(app.id)}
                          disabled={isUpdatingStatus}
                          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 shadow-green-500/20"
                        >
                          <Check size={16} /> Accept Creator
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <EmptyState
                icon={<User size={48} className="text-neutral-300" />}
                title={filter === 'ALL' ? "No applicants yet" : `No ${filter.toLowerCase()} applicants`}
                description={
                  filter === 'ALL' 
                    ? "When creators apply to this collab, their pitches will appear here." 
                    : "Try changing your filter to see other applications."
                }
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default GigApplicants;
