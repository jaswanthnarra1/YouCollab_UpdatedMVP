/**
 * YouCollab — Supabase Realtime Subscription Manager
 * =====================================================
 * Manages Postgres Changes subscriptions for live updates.
 *
 * Channels:
 *   • notifications:{userId} → New notification inserts for a user
 *   • applications:{gigId}   → Application status changes for a gig
 *   • gigs:feed              → New gig postings (global feed)
 *   • messages:{userId}      → New messages for a user
 *
 * Usage (backend — for broadcasting or SSE bridging):
 *   const { subscribeToNotifications, unsubscribe } = require('../supabase/realtime');
 *
 * Usage (frontend — via Supabase JS client directly):
 *   These helpers are primarily for backend use cases like SSE push.
 *   The frontend uses its own Supabase client with React hooks.
 */

const { supabase } = require('./client');

// Track active channels for cleanup
const activeChannels = new Map();

/**
 * Subscribe to new notifications for a specific user.
 *
 * @param {string} userId - UUID of the user to listen for
 * @param {function} callback - Called with { eventType, new, old } on each change
 * @returns {object} Supabase RealtimeChannel instance
 */
const subscribeToNotifications = (userId, callback) => {
  const channelName = `notifications:${userId}`;

  // Clean up existing channel for this user if any
  if (activeChannels.has(channelName)) {
    activeChannels.get(channelName).unsubscribe();
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `userId=eq.${userId}`,
      },
      (payload) => {
        callback({
          eventType: 'INSERT',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`🔔 Realtime: Subscribed to notifications for user ${userId.slice(0, 8)}...`);
      }
    });

  activeChannels.set(channelName, channel);
  return channel;
};

/**
 * Subscribe to application status changes for a specific gig.
 *
 * @param {string} gigId - UUID of the gig
 * @param {function} callback - Called on INSERT or UPDATE events
 * @returns {object} Supabase RealtimeChannel instance
 */
const subscribeToApplications = (gigId, callback) => {
  const channelName = `applications:${gigId}`;

  if (activeChannels.has(channelName)) {
    activeChannels.get(channelName).unsubscribe();
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'applications',
        filter: `gigId=eq.${gigId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`📋 Realtime: Subscribed to applications for gig ${gigId.slice(0, 8)}...`);
      }
    });

  activeChannels.set(channelName, channel);
  return channel;
};

/**
 * Subscribe to new gig postings (global feed).
 *
 * @param {function} callback - Called on new gig INSERT events
 * @returns {object} Supabase RealtimeChannel instance
 */
const subscribeToGigFeed = (callback) => {
  const channelName = 'gigs:feed';

  if (activeChannels.has(channelName)) {
    activeChannels.get(channelName).unsubscribe();
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'gigs',
      },
      (payload) => {
        callback({
          eventType: 'INSERT',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('🚀 Realtime: Subscribed to global gig feed');
      }
    });

  activeChannels.set(channelName, channel);
  return channel;
};

/**
 * Subscribe to new messages for a specific user.
 *
 * @param {string} userId - UUID of the user to listen for
 * @param {function} callback - Called on new message INSERT events
 * @returns {object} Supabase RealtimeChannel instance
 */
const subscribeToMessages = (userId, callback) => {
  const channelName = `messages:${userId}`;

  if (activeChannels.has(channelName)) {
    activeChannels.get(channelName).unsubscribe();
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiverId=eq.${userId}`,
      },
      (payload) => {
        callback({
          eventType: 'INSERT',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`💬 Realtime: Subscribed to messages for user ${userId.slice(0, 8)}...`);
      }
    });

  activeChannels.set(channelName, channel);
  return channel;
};

/**
 * Unsubscribe from a specific channel by name.
 *
 * @param {string} channelName - e.g. "notifications:uuid-here"
 */
const unsubscribe = (channelName) => {
  if (activeChannels.has(channelName)) {
    activeChannels.get(channelName).unsubscribe();
    activeChannels.delete(channelName);
    console.log(`🔌 Realtime: Unsubscribed from ${channelName}`);
  }
};

/**
 * Unsubscribe from all active channels.
 * Useful for graceful server shutdown.
 */
const unsubscribeAll = () => {
  for (const [name, channel] of activeChannels) {
    channel.unsubscribe();
    console.log(`🔌 Realtime: Unsubscribed from ${name}`);
  }
  activeChannels.clear();
};

/**
 * Get count of active subscriptions.
 * @returns {number}
 */
const getActiveChannelCount = () => activeChannels.size;

/**
 * List all active channel names.
 * @returns {string[]}
 */
const getActiveChannelNames = () => Array.from(activeChannels.keys());

module.exports = {
  subscribeToNotifications,
  subscribeToApplications,
  subscribeToGigFeed,
  subscribeToMessages,
  unsubscribe,
  unsubscribeAll,
  getActiveChannelCount,
  getActiveChannelNames,
};
