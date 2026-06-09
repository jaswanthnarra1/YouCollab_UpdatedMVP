import React from 'react';
import { cn } from '../../utils';

export const PageWrapper = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn('animate-fade-in w-full text-left', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default PageWrapper;
