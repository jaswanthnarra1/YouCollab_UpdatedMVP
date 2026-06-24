import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils';
import { Button } from './Button';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
}) => {
  // Prevent background scrolling when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop Backdrop blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={cn(
          'relative w-full rounded-3xl bg-dark-surface border border-dark-border p-6 shadow-2xl transition-all duration-300 animate-fade-in z-10',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-dark-border">
          {title && (
            <h3 className="text-lg font-bold text-dark-text tracking-tight">
              {title}
            </h3>
          )}
          {showClose && (
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-dark-muted hover:bg-dark-bg hover:text-dark-text transition-all"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="py-4 text-sm text-dark-text leading-relaxed">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
