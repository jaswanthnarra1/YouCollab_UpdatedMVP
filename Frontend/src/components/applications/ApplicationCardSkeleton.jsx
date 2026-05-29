import React from 'react';
import { Card } from '../ui/Card';
import Skeleton from '../ui/Skeleton';

export const ApplicationCardSkeleton = () => {
  return (
    <Card className="flex flex-col md:flex-row gap-5 border-neutral-200/60 dark:border-dark-border text-left">
      {/* Creator Info Sidebar Panel */}
      <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:w-48 shrink-0 pb-4 md:pb-0 md:border-r border-neutral-100 dark:border-dark-border">
        <Skeleton variant="avatar" className="h-16 w-16" />
        
        <div className="flex-1 md:flex-initial space-y-1.5 w-full">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
          <div className="flex gap-1.5 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Pitch Content */}
      <div className="flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          
          <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-100 dark:bg-dark-bg/60 dark:border-dark-border space-y-2">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ApplicationCardSkeleton;
