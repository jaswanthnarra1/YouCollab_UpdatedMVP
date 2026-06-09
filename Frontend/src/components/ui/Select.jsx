import React from 'react';
import { cn } from '../../utils';

export const Select = React.forwardRef(({
  className,
  label,
  error,
  icon,
  options = [],
  required = false,
  placeholder = 'Select an option',
  ...props
}, ref) => {
  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label className="block text-xs font-semibold text-neutral-600 dark:text-dark-muted tracking-wide uppercase select-none">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-dark-muted">
            {icon}
          </div>
        )}
        <select
          ref={ref}
          className={cn(
            'block w-full appearance-none rounded-xl border border-neutral-300 bg-white px-4 py-3 pr-10 text-sm text-neutral-900 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-dark-text',
            icon && 'pl-11',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-400/20 dark:border-red-500/50',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        
        {/* Dropdown Chevron */}
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-neutral-400 dark:text-dark-muted">
          <svg className="h-4 w-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      {error && (
        <span className="block text-xs text-red-500 select-none animate-fade-in">
          {error}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
