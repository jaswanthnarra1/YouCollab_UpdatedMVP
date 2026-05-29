import { useMutation } from '@tanstack/react-query';
import * as uploadApi from '../api/upload.api';
import useUiStore from '../stores/uiStore';

/**
 * Hook to manage image upload mutation.
 */
export const useUpload = () => {
  const addToast = useUiStore((state) => state.addToast);

  const uploadMutation = useMutation({
    mutationFn: (file) => uploadApi.uploadFile(file),
    onSuccess: () => {
      addToast('Image uploaded successfully! 📸', 'success');
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Failed to upload image. Ensure it is less than 5MB and a valid JPEG/PNG/WEBP.';
      addToast(message, 'error');
    },
  });

  return {
    upload: uploadMutation.mutateAsync, // mutateAsync allows holding await inside the forms
    isUploading: uploadMutation.isPending,
  };
};
export default useUpload;
