import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils';

export const Button = React.forwardRef(({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,
  disabled = false,
  to,
  children,
  ...props
}, ref) => {
  const isSpinning = isLoading || loading;
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none';
  
  const variants = {
    primary: 'bg-primary text-dark-deeper hover:bg-primary-hover shadow-sm shadow-primary/20 hover:shadow-glow',
    secondary: 'border border-dark-border bg-dark-surface text-dark-text hover:bg-dark-hover hover:border-primary/30',
    outline: 'border border-dark-border bg-transparent text-dark-text hover:bg-dark-surface hover:border-primary/20',
    ghost: 'text-dark-muted hover:bg-dark-surface hover:text-dark-text',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-500/10',
    outlineDanger: 'border border-rose-500/30 text-rose-400 hover:bg-rose-950/20',
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base rounded-2xl',
  };

  const classes = cn(baseStyles, variants[variant], sizes[size], className);

  // If 'to' prop is provided, render as a Link
  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      disabled={disabled || isSpinning}
      className={classes}
      {...props}
    >
      {isSpinning ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Hang tight...
        </>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
