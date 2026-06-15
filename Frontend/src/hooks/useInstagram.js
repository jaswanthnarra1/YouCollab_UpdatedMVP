/**
 * YouCollab — useInstagram Hook
 * ==============================
 * TanStack React Query hooks for all Instagram Graph API operations.
 * Follows the same pattern as useApplications.js.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as igApi from '../services/instagram.service';
import useUiStore from '../stores/uiStore';

const IG_PROFILE_KEY = ['instagram', 'profile'];

/**
 * Query hook — fetches cached Instagram profile from the DB.
 * Call this wherever you need to display Instagram data.
 */
export const useIgProfile = () => {
  return useQuery({
    queryKey: IG_PROFILE_KEY,
    queryFn: () => igApi.getIgProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (res) => res?.data?.instagram ?? null,
  });
};

/**
 * All Instagram mutation hooks bundled together.
 * Usage: const { connect, sync, disconnect, isSyncing } = useInstagram();
 */
export const useInstagram = () => {
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);

  // ── Connect: get OAuth URL and redirect browser to Meta ──────────────────
  const connectMutation = useMutation({
    mutationFn: () => igApi.getConnectUrl(),
    onSuccess: (res) => {
      const { url } = res.data;
      if (url) {
        // Redirect the browser to Meta's OAuth consent page
        window.location.href = url;
      }
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Failed to start Instagram connection.';
      addToast(message, 'error');
    },
  });

  // ── Callback: called from InstagramCallback page after OAuth redirect ─────
  const callbackMutation = useMutation({
    mutationFn: ({ code, state }) => igApi.handleCallback(code, state),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: IG_PROFILE_KEY });
      // Also invalidate auth/me so influencer profile in nav refreshes
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      const username = res?.data?.instagram?.username;
      addToast(`Instagram connected! Welcome, @${username} 🎉`, 'success');
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Failed to connect Instagram. Please try again.';
      addToast(message, 'error');
    },
  });

  // ── Sync: re-fetch latest metrics from Graph API ──────────────────────────
  const syncMutation = useMutation({
    mutationFn: () => igApi.syncInstagram(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IG_PROFILE_KEY });
      addToast('Instagram data synced successfully ✅', 'success');
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Sync failed. Check your Instagram connection.';
      addToast(message, 'error');
    },
  });

  // ── Disconnect: clears all IG fields ─────────────────────────────────────
  const disconnectMutation = useMutation({
    mutationFn: () => igApi.disconnectInstagram(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IG_PROFILE_KEY });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      addToast('Instagram disconnected.', 'info');
    },
    onError: (error) => {
      const message = error.responseError?.message || 'Failed to disconnect Instagram.';
      addToast(message, 'error');
    },
  });

  return {
    // connect
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,

    // callback (used by InstagramCallback page)
    handleCallback: callbackMutation.mutate,
    isHandlingCallback: callbackMutation.isPending,
    callbackSuccess: callbackMutation.isSuccess,
    callbackError: callbackMutation.isError,

    // sync
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,

    // disconnect
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
  };
};
