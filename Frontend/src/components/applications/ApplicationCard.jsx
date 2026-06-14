import React from 'react';
import { Instagram, Users, Calendar, ArrowUpRight } from 'lucide-react';
import { formatDate } from '../../utils';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const ApplicationCard = ({
  application,
  onAccept,
  onDecline,
  isProcessing = false,
}) => {
  const influencer = application?.influencer || {};
  const name = influencer.name || 'Anonymous Creator';
  const handle = influencer.instagramHandle || '@creator';
  const niche = influencer.niche || 'Lifestyle';
  const followers = influencer.followerCount || 0;
  
  const statusColors = {
    PENDING: 'warning',
    ACCEPTED: 'success',
    REJECTED: 'danger',
  };

  const statusLabel = {
    PENDING: 'Pending Review',
    ACCEPTED: 'Accepted ✓',
    REJECTED: 'Declined ✗',
  };

  // Convert follower count to nice format (e.g. 15.4K)
  const formatFollowers = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <Card className="flex flex-col md:flex-row gap-5 text-left">
      
      {/* Creator Info Sidebar Panel */}
      <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:w-48 shrink-0 pb-4 md:pb-0 md:border-r border-dark-border">
        <Avatar src={influencer.profileImageUrl} name={name} size="lg" className="h-16 w-16" />
        
        <div className="flex-1 md:flex-initial space-y-1 text-left">
          <h4 className="text-sm font-bold text-dark-text tracking-tight truncate max-w-[150px]">
            {name}
          </h4>
          
          <a
            href={`https://instagram.com/${handle.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-light hover:underline"
          >
            <Instagram size={12} />
            {handle}
            <ArrowUpRight size={10} />
          </a>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="primary" className="text-[9px] px-2 py-0.5 leading-none shrink-0 tracking-normal normal-case">
              {niche}
            </Badge>
            <Badge variant="neutral" className="text-[9px] px-2 py-0.5 leading-none shrink-0 tracking-normal normal-case flex gap-1 items-center">
              <Users size={10} />
              {formatFollowers(followers)} followers
            </Badge>
          </div>
        </div>
      </div>

      {/* Pitch Pitch Content Block */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1 text-[10px] font-bold text-dark-muted uppercase tracking-widest">
              <Calendar size={12} />
              Applied {formatDate(application?.createdAt)}
            </span>
            <Badge variant={statusColors[application?.status || 'PENDING']} className="text-[10px] font-semibold leading-tight">
              {statusLabel[application?.status || 'PENDING']}
            </Badge>
          </div>
          
          <div className="rounded-2xl bg-dark-bg/60 p-4 border border-dark-border">
            <h5 className="text-[11px] font-bold text-dark-muted uppercase tracking-wider mb-1.5 select-none">
              Creator's Pitch ✨
            </h5>
            <p className="text-xs text-dark-text leading-relaxed whitespace-pre-line">
              {application?.coverNote}
            </p>
          </div>
        </div>

        {/* Brand Action Buttons Row */}
        {application?.status === 'PENDING' && (
          <div className="flex gap-2.5 justify-end mt-4">
            <Button
              size="sm"
              variant="secondary"
              isLoading={isProcessing}
              onClick={() => onDecline(application?.id)}
            >
              Decline ✗
            </Button>
            <Button
              size="sm"
              isLoading={isProcessing}
              onClick={() => onAccept(application?.id)}
            >
              Accept ✓
            </Button>
          </div>
        )}
      </div>

    </Card>
  );
};

export default ApplicationCard;
