import React from 'react';
import { cn } from '../../utils';

export const Card = ({
  className,
  children,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'card-premium p-6',
        hoverable && 'card-premium-hover',
        className
      )}
      {...props}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default Card;
