import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Toast = ({
  message,
  type = 'success',
  onClose,
}) => {
  const iconMap = {
    success: <CheckCircle className="text-emerald-500 shrink-0" size={18} />,
    error: <AlertCircle className="text-rose-500 shrink-0" size={18} />,
    info: <Info className="text-sky-500 shrink-0" size={18} />,
  };

  const bgMap = {
    success: 'border-emerald-100 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-500/20',
    error: 'border-rose-100 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-500/20',
    info: 'border-sky-100 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-500/20',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 w-[340px] p-4 rounded-2xl border shadow-lg bg-white/80 backdrop-blur-md transition-all duration-300 dark:bg-dark-surface animate-fade-in text-sm text-neutral-800 dark:text-dark-text font-medium',
        bgMap[type]
      )}
    >
      {iconMap[type]}
      <div className="flex-1 text-left leading-snug">{message}</div>
      <button
        onClick={onClose}
        className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-dark-bg hover:text-neutral-700 dark:hover:text-dark-text transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default Toast;
