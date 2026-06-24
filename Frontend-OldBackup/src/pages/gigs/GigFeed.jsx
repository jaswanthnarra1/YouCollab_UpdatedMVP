import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { Search, MapPin, Eye, Clock, Building, PlusCircle } from 'lucide-react';
import { useGigs } from '../../hooks/useGigs';
import { useAuthStore } from '../../stores/authStore';
import { formatBudget, getRelativeTime } from '../../utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';

export const GigFeed = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const { ref, inView } = useInView();
  
  const { useGigFeed } = useGigs();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useGigFeed({ 
    search: debouncedSearch, 
    category: category || undefined,
    status: 'OPEN' // Only show open gigs in feed
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Infinite scroll
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten the pages array of arrays into a single array of gigs
  const gigs = data?.pages?.flatMap(page => page?.data || []).filter(Boolean) || [];

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'Food & Beverage', label: 'Food & Beverage' },
    { value: 'Fashion', label: 'Fashion' },
    { value: 'Fitness', label: 'Fitness' },
    { value: 'Tech', label: 'Tech' },
    { value: 'Beauty', label: 'Beauty' },
    { value: 'Lifestyle', label: 'Lifestyle' }
  ];

  return (
    <div className="space-y-6 animate-fade-in w-full text-left">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-dark-surface p-6 rounded-2xl border border-dark-border shadow-sm">
        <div className="flex-1 w-full space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-text">Discover Pune Gigs</h1>
            <p className="text-dark-muted mt-1">
              Find and apply to local collaborations that match your aesthetic.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search gigs by title or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={18} className="text-dark-muted" />}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categories}
              />
            </div>
          </div>
        </div>
        
        {user?.role === 'BRAND' && (
          <Button to="/gigs/create" className="flex items-center gap-2 whitespace-nowrap">
            <PlusCircle size={18} />
            Post New Collab
          </Button>
        )}
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="p-0 overflow-hidden h-[340px]">
              <div className="p-6 border-b border-dark-border space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton variant="avatar" className="w-10 h-10" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Something went wrong"
          description="We couldn't load the gigs. Please try again."
          actionText="Retry"
          onAction={() => window.location.reload()}
        />
      ) : gigs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map((gig) => (
              <Card 
                key={gig?.id} 
                className="p-0 overflow-hidden flex flex-col h-full hover:shadow-premium-hover hover:border-primary/30 border-dark-border transition-all cursor-pointer group text-left"
                onClick={() => navigate(`/gigs/${gig?.id}`)}
              >
                <div className="p-6 border-b border-dark-border flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="primary">
                      {gig?.category}
                    </Badge>
                    <div className="flex items-center text-xs font-semibold text-dark-muted bg-dark-bg border border-dark-border px-2.5 py-1 rounded-md">
                      <Clock size={12} className="mr-1.5" />
                      {getRelativeTime(gig?.deadline)}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary-light transition-colors line-clamp-2 text-dark-text">
                    {gig?.title}
                  </h3>
                  
                  <p className="text-sm text-dark-muted line-clamp-3 mb-6 flex-1">
                    {gig?.description}
                  </p>
                  
                  <div className="mt-auto">
                    <div className="text-lg font-bold text-dark-text">
                      {formatBudget(gig?.budgetMin || 0, gig?.budgetMax)}
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-dark-surface/50 border-t border-dark-border flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar 
                      src={gig?.brand?.logoUrl} 
                      name={gig?.brand?.businessName || 'B'} 
                      size="sm" 
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-dark-text">
                        {gig?.brand?.businessName}
                      </p>
                      <p className="text-xs text-dark-muted flex items-center gap-1 truncate mt-0.5">
                        <MapPin size={10} /> {gig?.city}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs text-dark-muted pl-2">
                    <Eye size={14} />
                    {gig?.viewCount || 0}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          {/* Intersection Observer target for infinite scroll */}
          <div ref={ref} className="py-8 flex justify-center">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-dark-muted">
                <svg className="animate-spin h-5 w-5 text-primary-light" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading more gigs...</span>
              </div>
            ) : hasNextPage ? (
              <Button variant="outline" onClick={() => fetchNextPage()}>Load More</Button>
            ) : (
              <p className="text-dark-muted text-sm font-semibold">You've reached the end! 🚀</p>
            )}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Search size={40} />}
          title="No gigs found"
          description={searchTerm || category ? "Try adjusting your search filters to find more collabs." : "Check back later for new opportunities in Pune."}
          actionText={(searchTerm || category) ? "Clear Filters" : undefined}
          onAction={(searchTerm || category) ? () => { setSearchTerm(''); setCategory(''); } : undefined}
        />
      )}
    </div>
  );
};

export default GigFeed;
