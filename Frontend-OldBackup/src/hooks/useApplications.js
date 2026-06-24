import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as appsApi from '../services/applications.service';
import useUiStore from '../stores/uiStore';

/**
 * React Query hooks for managing Collab Applications.
 */
export const useApplications = () => {
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);

  // Apply to a Gig
  const applyMutation = useMutation({
    mutationFn: ({ gigId, coverNote }) => appsApi.apply({ gigId, coverNote }),
    onSuccess: (response) => {
      const app = response.data;
      queryClient.invalidateQueries({ queryKey: ['gigs', 'detail', app.gigId] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      addToast('Applied successfully! The brand will review your pitch soon. ✨', 'success');
    },
    onError: (error) => {
      const message = error.responseError?.message || "Failed to apply. Let's verify you haven't already applied.";
      addToast(message, 'error');
    },
  });

  // Get applicants for a specific Gig (Brand View)
  const useGigApplicants = (gigId, filters = {}) => {
    return useQuery({
      queryKey: ['applications', 'gig', gigId, filters],
      queryFn: () => appsApi.listApplicants(gigId, filters),
      enabled: !!gigId,
      staleTime: 30 * 1000, // 30 seconds
    });
  };

  // Get creator's own applications (Influencer View)
  const useMyApplications = (filters = {}) => {
    return useQuery({
      queryKey: ['applications', 'mine', filters],
      queryFn: () => appsApi.listMyApplications(filters),
      staleTime: 30 * 1000,
    });
  };

  // Update application status (Accept / Reject)
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => appsApi.updateStatus(id, status),
    onSuccess: (response, variables) => {
      const app = response.data;
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['gigs', 'detail', app.gigId] });
      
      const isAccepted = variables.status === 'ACCEPTED';
      const actionText = isAccepted ? 'accepted! 🎊' : 'declined.';
      addToast(`Applicant ${actionText}`, isAccepted ? 'success' : 'info');
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Failed to update application status.';
      addToast(message, 'error');
    },
  });

  return {
    apply: applyMutation.mutate,
    isApplying: applyMutation.isPending,
    useGigApplicants,
    useMyApplications,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
};
