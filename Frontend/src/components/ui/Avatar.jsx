import React, { useState } from 'react';
import { cn, getInitials } from '../../lib/utils';

export const Avatar = ({
  src,
  name = '',
  size = 'md',
  className,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  const baseStyles = 'relative flex shrink-0 overflow-hidden rounded-full border border-neutral-200 dark:border-dark-border select-none items-center justify-center font-bold tracking-wide text-neutral-700 dark:text-dark-text';

  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-2xl',
  };

  const bgColors = [
    'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
    'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
    'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
  ];

  // Pick a stable color index based on hash value of name
  const getColorIndex = (nameStr) => {
    let hash = 0;
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % bgColors.length;
  };

  const initials = getInitials(name);
  const colorClass = bgColors[getColorIndex(name)];

  const serverUrl = src && src.startsWith('/') ? `http://localhost:5000${src}` : src;

  return (
    <div
      className={cn(
        baseStyles,
        sizes[size],
        (!src || hasError) && colorClass,
        className
      )}
      {...props}
    >
      {src && !hasError ? (
        <img
          src={serverUrl}
          alt={name}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover transition-opacity duration-200"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;
