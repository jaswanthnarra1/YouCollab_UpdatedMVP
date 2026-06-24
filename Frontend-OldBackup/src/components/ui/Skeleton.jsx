import React from 'react';
import { cn } from '../../utils';

export const Skeleton = ({
  className,
  variant = 'text', // 'text', 'avatar', 'rect'
  ...props
}) => {
  const baseStyles = 'bg-dark-card animate-pulse';

  const variants = {
    text: 'h-4 w-full rounded',
    avatar: 'rounded-full shrink-0',
    rect: 'rounded-2xl',
  };

  return (
    <div
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    />
  );
};

export default Skeleton;
