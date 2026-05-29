import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({
  className,
  children,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 dark:border-dark-border dark:bg-dark-surface',
        hoverable && 'hover:shadow-premium hover:-translate-y-0.5 hover:border-neutral-300 dark:hover:border-neutral-700',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
