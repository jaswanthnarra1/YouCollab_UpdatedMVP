import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils';

export const Input = React.forwardRef(({
  className,
  type = 'text',
  label,
  error,
  icon,
  required = false,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label className="block text-xs font-semibold text-dark-muted tracking-wide uppercase select-none">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      <div className="relative rounded-xl">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-muted">
            {icon}
          </div>
        )}
        <input
          type={inputType}
          ref={ref}
          className={cn(
            'block w-full rounded-xl border border-dark-border bg-dark-deeper px-4 py-3 text-sm text-dark-text transition-all placeholder:text-dark-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
            icon && 'pl-11',
            isPassword && 'pr-11',
            error && 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-dark-muted hover:text-dark-text transition-colors outline-none"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex="-1"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <span className="block text-xs text-rose-400 select-none animate-fade-in">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
