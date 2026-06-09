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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none';
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm shadow-primary/20',
    secondary: 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:bg-dark-bg',
    outline: 'border border-neutral-300 bg-transparent text-neutral-700 hover:bg-neutral-50 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-surface',
    ghost: 'text-neutral-600 hover:bg-neutral-100 dark:text-dark-muted dark:hover:bg-dark-surface',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/10',
    outlineDanger: 'border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-950/20',
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
