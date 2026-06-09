import React from 'react';
import { cn } from '../../utils';

export const Textarea = React.forwardRef(({
  className,
  label,
  error,
  required = false,
  rows = 4,
  ...props
}, ref) => {
  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label className="block text-xs font-semibold text-neutral-600 dark:text-dark-muted tracking-wide uppercase select-none">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:placeholder:text-dark-muted resize-none',
          error && 'border-red-400 focus:border-red-400 focus:ring-red-400/20 dark:border-red-500/50',
          className
        )}
        {...props}
      />
      {error && (
        <span className="block text-xs text-red-500 select-none animate-fade-in">
          {error}
        </span>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
export default Textarea;
