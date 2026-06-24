import React from 'react';
import useUiStore from '../../stores/uiStore';
import Toast from './Toast';

export const ToastProvider = ({ children }) => {
  const toasts = useUiStore((state) => state.toasts);
  const removeToast = useUiStore((state) => state.removeToast);

  return (
    <>
      {children}
      
      {/* Toast Fixed Portal Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-full">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
};

export default ToastProvider;
