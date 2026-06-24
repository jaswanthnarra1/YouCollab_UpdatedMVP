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
        <label className="block text-xs font-semibold text-dark-muted tracking-wide uppercase select-none">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'block w-full rounded-xl border border-dark-border bg-dark-deeper px-4 py-3 text-sm text-dark-text transition-all placeholder:text-dark-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none',
          error && 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20',
          className
        )}
        {...props}
      />
      {error && (
        <span className="block text-xs text-rose-400 select-none animate-fade-in">
          {error}
        </span>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
export default Textarea;
