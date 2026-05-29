import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Standard utility to combine tailwind classes safely.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format date string to user-friendly local Pune format (e.g., 29 May 2026).
 */
export function formatDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format currency ranges nicely (e.g. ₹5,000 - ₹8,000).
 */
export function formatBudget(min, max) {
  const formatValue = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (!max) {
    return formatValue(min);
  }

  return `${formatValue(min)} – ${formatValue(max).replace('₹', '')}`;
}

/**
 * Express dates in human-readable relative time (e.g., "Due in 3 days").
 */
export function getRelativeTime(dateInput) {
  if (!dateInput) return '';
  const targetDate = new Date(dateInput);
  const now = new Date();
  
  // Set times to midnight to calculate pure days
  targetDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'Deadline passed';
  }
  if (diffDays === 0) {
    return 'Due today';
  }
  if (diffDays === 1) {
    return 'Due tomorrow';
  }
  return `Due in ${diffDays} days`;
}

/**
 * Get initials from profile name (e.g. Priya Sharma -> PS).
 */
export function getInitials(name) {
  if (!name) return 'YC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'YC';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
