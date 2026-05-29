import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as gigsApi from '../api/gigs.api';
import useUiStore from '../stores/uiStore';

/**
 * React Query hooks for managing Gigs (Collabs)
 */
export const useGigs = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const addToast = useUiStore((state) => state.addToast);

  // Gig Feed: Infinite scroll query
  const useGigFeed = (filters = {}) => {
    return useInfiniteQuery({
      queryKey: ['gigs', 'feed', filters],
      queryFn: ({ pageParam }) => {
        return gigsApi.getGigs({ ...filters, cursor: pageParam });
      },
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => {
        return lastPage?.pagination?.nextCursor || undefined;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Fetch single Gig Details
  const useGigDetail = (id) => {
    return useQuery({
      queryKey: ['gigs', 'detail', id],
      queryFn: () => gigsApi.getGigById(id),
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Brand's own posted gigs
  const useMyGigs = () => {
    return useQuery({
      queryKey: ['gigs', 'mine'],
      queryFn: gigsApi.getMyGigs,
      staleTime: 30 * 1000,
    });
  };

  // Create a new Collab/Gig
  const createGigMutation = useMutation({
    mutationFn: gigsApi.createGig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      addToast('Your collab is live! 🎉 Ready to receive applications.', 'success');
      navigate('/gigs/mine');
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Failed to post collab. Try checking your inputs.';
      addToast(message, 'error');
    },
  });

  // Edit/Update a Collab
  const updateGigMutation = useMutation({
    mutationFn: ({ id, data }) => gigsApi.updateGig(id, data),
    onSuccess: (response) => {
      const gig = response.data;
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['gigs', 'detail', gig.id] });
      addToast('Collab updated successfully! ✨', 'success');
      navigate('/gigs/mine');
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Failed to update collab details.';
      addToast(message, 'error');
    },
  });

  // Soft-close a Collab
  const closeGigMutation = useMutation({
    mutationFn: (id) => gigsApi.closeGig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      addToast('Collab closed. No further applications can be submitted.', 'success');
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Failed to close collab.';
      addToast(message, 'error');
    },
  });

  return {
    useGigFeed,
    useGigDetail,
    useMyGigs,
    createGig: createGigMutation.mutate,
    isCreating: createGigMutation.isPending,
    updateGig: updateGigMutation.mutate,
    isUpdating: updateGigMutation.isPending,
    closeGig: closeGigMutation.mutate,
    isClosing: closeGigMutation.isPending,
  };
};
