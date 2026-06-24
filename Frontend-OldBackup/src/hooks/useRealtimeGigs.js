/**
 * YouCollab — Real-time Gigs Feed Hook
 * =======================================
 * Subscribes to Supabase Postgres Changes on the gigs table
 * for live feed updates. New gig postings appear instantly
 * without requiring a page refresh.
 *
 * Usage:
 *   import { useRealtimeGigs } from '../hooks/useRealtimeGigs';
 *
 *   function GigFeed() {
 *     const { newGig, updatedGig, isConnected } = useRealtimeGigs({
 *       onNewGig: (gig) => toast.success(`New collab: ${gig.title}`),
 *     });
 *   }
 */

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase.service';

/**
 * Hook to subscribe to real-time gig feed updates.
 *
 * @param {object} [options] - Configuration options
 * @param {function} [options.onNewGig] - Callback when a new gig is posted
 * @param {function} [options.onGigUpdated] - Callback when a gig is updated
 * @param {function} [options.onGigDeleted] - Callback when a gig is removed
 * @returns {{ newGig: object|null, updatedGig: object|null, isConnected: boolean }}
 */
export const useRealtimeGigs = (options = {}) => {
  const { onNewGig, onGigUpdated, onGigDeleted } = options;
  const [newGig, setNewGig] = useState(null);
  const [updatedGig, setUpdatedGig] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    const channel = supabase
      .channel('gigs:feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gigs',
        },
        (payload) => {
          setNewGig(payload.new);
          if (onNewGig) onNewGig(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gigs',
        },
        (payload) => {
          setUpdatedGig(payload.new);
          if (onGigUpdated) onGigUpdated(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'gigs',
        },
        (payload) => {
          if (onGigDeleted) onGigDeleted(payload.old);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('🚀 Real-time gig feed connected');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [onNewGig, onGigUpdated, onGigDeleted]);

  return {
    newGig,
    updatedGig,
    isConnected,
  };
};

export default useRealtimeGigs;
