import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, IndianRupee, Users } from 'lucide-react';
import { formatBudget, getRelativeTime } from '../../utils';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';

export const GigCard = ({ gig }) => {
  const brand = gig.brand || {};
  const businessName = brand.businessName || 'Brand Partner';
  const logoUrl = brand.logoUrl;
  const applicantCount = gig._count?.applications || 0;
  
  // Calculate if active recently (lastActiveAt within 3 days)
  const isBrandActiveRecently = () => {
    const lastActive = brand.user?.lastActiveAt;
    if (!lastActive) return false;
    const diff = Date.now() - new Date(lastActive).getTime();
    return diff < 3 * 24 * 60 * 60 * 1000; // 3 days
  };

  return (
    <Card hoverable className="flex flex-col h-full justify-between text-left">
      <div>
        {/* Brand Meta Row */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <Avatar src={logoUrl} name={businessName} size="sm" />
            <div>
              <h4 className="text-xs font-bold text-dark-text tracking-tight truncate max-w-[130px]">
                {businessName}
              </h4>
              <p className="text-[10px] text-dark-muted font-medium">Pune</p>
            </div>
          </div>
          {isBrandActiveRecently() && (
            <Badge variant="success" className="text-[9px] px-2 py-0.5 leading-none shrink-0 normal-case">
              Active recently
            </Badge>
          )}
        </div>

        {/* Title & Info */}
        <Link to={`/gigs/${gig.id}`} className="group block mb-2.5">
          <h3 className="text-[15px] font-bold text-dark-text group-hover:text-primary-light transition-colors leading-snug tracking-tight">
            {gig.title}
          </h3>
        </Link>

        {/* Description Snippet */}
        <p className="text-xs text-dark-muted line-clamp-2 mb-4 leading-relaxed">
          {gig.description}
        </p>
      </div>

      <div>
        {/* Core Attributes */}
        <div className="grid grid-cols-2 gap-y-2 border-t border-dark-border pt-3 mb-4 text-xs font-medium text-dark-muted">
          <div className="flex items-center gap-1.5">
            <IndianRupee size={14} className="text-dark-muted" />
            <span className="truncate">{formatBudget(gig.budgetMin, gig.budgetMax)}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Calendar size={14} className="text-dark-muted" />
            <span className="truncate">{getRelativeTime(gig.deadline)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Tag size={14} className="text-dark-muted" />
            <span className="truncate">{gig.category}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Users size={14} className="text-dark-muted" />
            <span className="truncate">{applicantCount} applied</span>
          </div>
        </div>

        {/* CTA Button */}
        <Link
          to={`/gigs/${gig.id}`}
          className="block w-full text-center py-2 px-4 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-dark-deeper text-xs font-bold transition-all duration-150 active:scale-[0.98]"
        >
          View collab details ✨
        </Link>
      </div>
    </Card>
  );
};

export default GigCard;
