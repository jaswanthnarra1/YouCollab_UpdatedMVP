import React from 'react';
import { cn } from '../../utils';

export const Badge = ({
  className,
  variant = 'neutral',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold select-none border tracking-wide uppercase';

  const variants = {
    neutral: 'bg-dark-surface text-dark-muted border-dark-border',
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    accent: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
