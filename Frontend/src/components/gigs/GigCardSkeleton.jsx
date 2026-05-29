import React from 'react';
import { Card } from '../ui/Card';
import Skeleton from '../ui/Skeleton';

export const GigCardSkeleton = () => {
  return (
    <Card className="flex flex-col h-full justify-between border-neutral-200/60 dark:border-dark-border text-left">
      <div>
        {/* Brand Meta Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Skeleton variant="avatar" className="w-8 h-8" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Title */}
        <div className="space-y-1.5 mb-3">
          <Skeleton className="h-4.5 w-full" />
          <Skeleton className="h-4.5 w-3/4" />
        </div>

        {/* Description */}
        <div className="space-y-1 mb-4">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>

      <div>
        {/* Attributes Grid */}
        <div className="grid grid-cols-2 gap-y-2.5 border-t border-neutral-100 dark:border-dark-border pt-4 mb-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16 justify-self-end" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-14 justify-self-end" />
        </div>

        {/* Action Button */}
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    </Card>
  );
};

export default GigCardSkeleton;
