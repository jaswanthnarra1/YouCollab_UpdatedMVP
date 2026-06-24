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
        <label className="block text-xs font-semibold text-dark-muted tracking-wide uppercase select-none">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-muted">
            {icon}
          </div>
        )}
        <select
          ref={ref}
          className={cn(
            'block w-full appearance-none rounded-xl border border-dark-border bg-dark-deeper px-4 py-3 pr-10 text-sm text-dark-text transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
            icon && 'pl-11',
            error && 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20',
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
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-dark-muted">
          <svg className="h-4 w-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      {error && (
        <span className="block text-xs text-rose-400 select-none animate-fade-in">
          {error}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
