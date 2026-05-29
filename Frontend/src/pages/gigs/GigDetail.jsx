import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, Eye, Briefcase, ChevronLeft, CalendarDays, CheckCircle, Navigation, FileText } from 'lucide-react';
import { useGigs } from '../../hooks/useGigs';
import { useAuthStore } from '../../stores/authStore';
import { useApplications } from '../../hooks/useApplications';
import { formatDate, formatBudget, getRelativeTime } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import EmptyState from '../../components/ui/EmptyState';

export const GigDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuthStore();
  const { useGigDetail } = useGigs();
  const { apply, isApplying } = useApplications();
  
  const { data: response, isLoading, isError } = useGigDetail(id);
  const gig = response?.data;

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [error, setError] = useState('');

  const isBrandOwner = isAuthenticated && user?.role === 'BRAND' && user?.brand?.id === gig?.brandId;
  const isInfluencer = isAuthenticated && user?.role === 'INFLUENCER';
  
  // Checking if influencer has already applied would require a specific check 
  // but for now we'll handle the error from the backend if they try to apply twice.
  // A robust approach would be to return `hasApplied` boolean in the gig detail response.
  const hasApplied = gig?.hasApplied || false;

  const handleApply = () => {
    if (!coverNote.trim()) {
      setError('Please write a short pitch or cover note.');
      return;
    }
    
    apply({ gigId: id, coverNote }, {
      onSuccess: () => {
        setIsApplyModalOpen(false);
        setCoverNote('');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        <div className="mb-4">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton variant="rect" className="h-48 rounded-3xl" />
            <Skeleton variant="rect" className="h-64 rounded-3xl" />
          </div>
          <div className="space-y-6">
            <Skeleton variant="rect" className="h-64 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !gig) {
    return (
      <div className="max-w-5xl mx-auto">
        <EmptyState
          icon={<Briefcase size={48} className="text-neutral-300" />}
          title="Collab Not Found"
          description="The collab you're looking for doesn't exist or has been removed."
          action={<Button to="/gigs">Back to Feed</Button>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Back navigation */}
      <Link to="/gigs" className="inline-flex items-center text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:text-dark-muted dark:hover:text-dark-text mb-6 transition-colors group">
        <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
        Back to Feed
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content (Left column) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card className="p-8 border-t-4 border-t-primary relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Badge variant={gig.status === 'OPEN' ? 'success' : 'default'} className="uppercase tracking-wider text-[10px]">
                  {gig.status}
                </Badge>
                <Badge variant="default" className="bg-primary/10 text-primary dark:bg-primary/20">
                  {gig.category}
                </Badge>
                <div className="flex items-center text-xs font-semibold text-neutral-500 bg-neutral-100 dark:bg-dark-bg px-2.5 py-1 rounded-md">
                  <Eye size={12} className="mr-1.5" />
                  {gig.viewCount || 0} views
                </div>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-dark-text mb-4 leading-tight">
                {gig.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-neutral-600 dark:text-dark-muted">
                <div className="flex items-center">
                  <MapPin size={16} className="mr-2 text-primary" />
                  {gig.city}
                </div>
                <div className="flex items-center">
                  <CalendarDays size={16} className="mr-2 text-secondary" />
                  Posted {formatDate(gig.createdAt)}
                </div>
                <div className="flex items-center">
                  <Clock size={16} className="mr-2 text-accent" />
                  {getRelativeTime(gig.deadline)}
                </div>
              </div>
            </div>
          </Card>

          {/* Details Section */}
          <div className="space-y-6">
            <Card className="p-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-dark-text">
                <FileText size={20} className="text-primary" />
                Campaign Description
              </h3>
              <div className="prose dark:prose-invert max-w-none text-neutral-600 dark:text-dark-muted whitespace-pre-wrap leading-relaxed">
                {gig.description}
              </div>
            </Card>

            <Card className="p-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-dark-text">
                <CheckCircle size={20} className="text-secondary" />
                Deliverables Required
              </h3>
              <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-5 text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-medium">
                {gig.deliverables}
              </div>
            </Card>
          </div>
        </div>

        {/* Sidebar (Right column) */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card className="p-6 sticky top-24 shadow-premium">
            <div className="mb-6">
              <p className="text-sm font-semibold text-neutral-500 dark:text-dark-muted uppercase tracking-wider mb-2">Campaign Budget</p>
              <div className="text-3xl font-extrabold text-neutral-900 dark:text-dark-text tracking-tight">
                {formatBudget(gig.budgetMin, gig.budgetMax)}
              </div>
            </div>

            <div className="space-y-4">
              {isBrandOwner ? (
                <Button to={`/gigs/${id}/applicants`} variant="primary" className="w-full" size="lg">
                  View Applicants
                </Button>
              ) : isInfluencer ? (
                gig.status === 'OPEN' ? (
                  hasApplied ? (
                    <Button variant="secondary" className="w-full bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-default" size="lg" disabled>
                      <CheckCircle size={18} className="mr-2" />
                      Applied Successfully
                    </Button>
                  ) : (
                    <Button 
                      variant="primary" 
                      className="w-full flex items-center justify-center gap-2" 
                      size="lg"
                      onClick={() => setIsApplyModalOpen(true)}
                    >
                      Apply Now <Navigation size={16} className="ml-1" />
                    </Button>
                  )
                ) : (
                  <Button variant="secondary" className="w-full cursor-not-allowed" size="lg" disabled>
                    Collab Closed
                  </Button>
                )
              ) : (
                <Button to="/login" variant="primary" className="w-full" size="lg">
                  Sign in to Apply
                </Button>
              )}
              
              <p className="text-xs text-center font-medium text-neutral-400 dark:text-neutral-500 flex items-center justify-center">
                <Clock size={12} className="mr-1" />
                Applications close {formatDate(gig.deadline)}
              </p>
            </div>
          </Card>

          {/* Brand Info Card */}
          <Card className="p-6">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-dark-text mb-4 uppercase tracking-wider">About the Brand</h4>
            
            <div className="flex items-center gap-4 mb-4">
              <Avatar src={gig.brand?.logoUrl} name={gig.brand?.businessName} size="lg" />
              <div>
                <h3 className="font-bold text-lg dark:text-dark-text">{gig.brand?.businessName}</h3>
                <p className="text-sm text-neutral-500 dark:text-dark-muted">{gig.brand?.category}</p>
              </div>
            </div>
            
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-4">
              {gig.brand?.bio || "No bio provided."}
            </div>
            
            {gig.brand?.website && (
              <a 
                href={gig.brand.website.startsWith('http') ? gig.brand.website : `https://${gig.brand.website}`}
                target="_blank" 
                rel="noreferrer"
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5 w-max"
              >
                Visit Website
                <Navigation size={12} className="rotate-45" />
              </a>
            )}
          </Card>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal 
        isOpen={isApplyModalOpen} 
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for this Collab"
      >
        <div className="space-y-4">
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
            <h4 className="font-bold text-primary text-sm mb-1">{gig?.title}</h4>
            <p className="text-xs text-primary/70">{formatBudget(gig?.budgetMin, gig?.budgetMax)}</p>
          </div>
          
          <Textarea
            label="Your Pitch / Cover Note"
            placeholder="Why are you the perfect fit for this campaign? Mention any past work or your unique angle."
            value={coverNote}
            onChange={(e) => {
              setCoverNote(e.target.value);
              if (error) setError('');
            }}
            error={error}
            rows={5}
            required
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-dark-border">
            <Button variant="ghost" onClick={() => setIsApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApply} isLoading={isApplying}>
              Submit Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GigDetail;
