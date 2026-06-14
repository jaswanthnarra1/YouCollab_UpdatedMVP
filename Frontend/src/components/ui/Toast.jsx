import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../utils';

export const Toast = ({
  message,
  type = 'success',
  onClose,
}) => {
  const iconMap = {
    success: <CheckCircle className="text-emerald-400 shrink-0" size={18} />,
    error: <AlertCircle className="text-rose-400 shrink-0" size={18} />,
    info: <Info className="text-primary shrink-0" size={18} />,
  };

  const bgMap = {
    success: 'border-emerald-500/20',
    error: 'border-rose-500/20',
    info: 'border-primary/20',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 w-[340px] p-4 rounded-2xl border shadow-lg bg-dark-surface/90 backdrop-blur-md transition-all duration-300 animate-fade-in text-sm text-dark-text font-medium border-dark-border',
        bgMap[type]
      )}
    >
      {iconMap[type]}
      <div className="flex-1 text-left leading-snug">{message}</div>
      <button
        onClick={onClose}
        className="rounded-full p-1 text-dark-muted hover:bg-dark-bg hover:text-dark-text transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default Toast;
