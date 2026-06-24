import React, { useState } from 'react';
import { cn, getInitials } from '../../utils';

export const Avatar = ({
  src,
  name = '',
  size = 'md',
  className,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  const baseStyles = 'relative flex shrink-0 overflow-hidden rounded-full border border-dark-border select-none items-center justify-center font-bold tracking-wide text-dark-text';

  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-2xl',
  };

  const bgColors = [
    'bg-primary/15 text-primary-light',
    'bg-emerald-500/15 text-emerald-400',
    'bg-rose-500/15 text-rose-400',
    'bg-amber-500/15 text-amber-400',
    'bg-cyan-500/15 text-cyan-400',
  ];

  // Pick a stable color index based on hash value of name
  const getColorIndex = (nameStr) => {
    if (!nameStr || typeof nameStr !== 'string') return 0;
    let hash = 0;
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % bgColors.length;
  };

  const initials = getInitials(name);
  const colorClass = bgColors[getColorIndex(name)];

  const serverUrl = src && src.startsWith('/') ? `http://127.0.0.1:5000${src}` : src;

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
