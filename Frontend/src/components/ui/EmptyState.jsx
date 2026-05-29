import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export const EmptyState = ({
  className,
  title = 'Nothing here yet 👀',
  description = 'Check back soon or explore other features.',
  icon,
  actionText,
  onAction,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto rounded-3xl border border-dashed border-neutral-200 dark:border-dark-border py-12',
        className
      )}
      {...props}
    >
      <div className="rounded-2xl bg-neutral-100 p-4 text-neutral-400 dark:bg-dark-surface dark:text-dark-muted mb-4">
        {icon ? (
          icon
        ) : (
          <svg className="h-7 w-7 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 17v-5" />
            <path d="M12 17V9" />
            <path d="M15 17v-3" />
          </svg>
        )}
      </div>
      
      <h3 className="text-base font-bold text-neutral-900 dark:text-dark-text mb-1 tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-neutral-500 dark:text-dark-muted mb-5 max-w-[260px] leading-relaxed">
        {description}
      </p>

      {actionText && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
