import React, { useState } from 'react';
import {
  Instagram,
  RefreshCw,
  Unlink,
  Users,
  Image,
  UserCheck,
  Clock,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useIgProfile, useInstagram } from '../../hooks/useInstagram';
import { formatDate, cn } from '../../utils';

// ─── Instagram gradient helper ────────────────────────────────────────────────
const IG_GRADIENT = 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';

// ─── Stat pill sub-component ─────────────────────────────────────────────────
const StatPill = ({ icon: Icon, label, value }) => (
  <div className="flex flex-col items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 flex-1 min-w-[80px]">
    <Icon size={15} className="text-[#8E8E93]" />
    <span className="text-white font-extrabold text-lg leading-none">
      {value !== null && value !== undefined ? value.toLocaleString('en-IN') : '—'}
    </span>
    <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">{label}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * InstagramConnectCard
 * =====================
 * Displays either:
 *   - A "Connect Instagram" CTA (when not connected)
 *   - A live stats card with profile picture, metrics and sync/disconnect controls (when connected)
 */
const InstagramConnectCard = () => {
  const { data: igProfile, isLoading } = useIgProfile();
  const { connect, isConnecting, sync, isSyncing, disconnect, isDisconnecting } = useInstagram();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const isConnected = igProfile?.isConnected;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="card-premium p-6 animate-pulse">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-40 bg-white/5 rounded" />
            <div className="h-4 w-24 bg-white/5 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // ── DISCONNECTED STATE ────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="card-premium p-6 relative overflow-hidden">
        {/* Subtle IG gradient glow in the background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ background: IG_GRADIENT }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Icon */}
          <div
            className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: IG_GRADIENT }}
          >
            <Instagram size={22} color="white" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white leading-tight">
              Connect Instagram
            </h3>
            <p className="text-sm text-[#8E8E93] mt-0.5 leading-relaxed">
              Link your Creator or Business account to display verified follower counts and unlock brand discovery.
            </p>
          </div>

          {/* CTA Button */}
          <button
            id="instagram-connect-btn"
            onClick={() => connect()}
            disabled={isConnecting}
            className={cn(
              'flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200',
              'shadow-lg hover:scale-[1.03] active:scale-[0.98]',
              isConnecting && 'opacity-60 cursor-not-allowed'
            )}
            style={{ background: IG_GRADIENT }}
          >
            {isConnecting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Instagram size={16} />
            )}
            {isConnecting ? 'Redirecting…' : 'Connect'}
          </button>
        </div>
      </div>
    );
  }

  // ── CONNECTED STATE ───────────────────────────────────────────────────────
  return (
    <div className="card-premium relative overflow-hidden">
      {/* Subtle IG gradient glow */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ background: IG_GRADIENT }}
      />

      <div className="relative z-10 p-6 space-y-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Profile Picture */}
            {igProfile.profilePicUrl ? (
              <img
                src={igProfile.profilePicUrl}
                alt={igProfile.username}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center ring-2 ring-white/10"
                style={{ background: IG_GRADIENT }}
              >
                <Instagram size={20} color="white" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-white">
                  @{igProfile.username}
                </span>
                {/* Verified badge */}
                <ShieldCheck size={15} className="text-emerald-400" />
              </div>
              {igProfile.bio && (
                <p className="text-xs text-[#8E8E93] mt-0.5 max-w-xs truncate">{igProfile.bio}</p>
              )}
            </div>
          </div>

          {/* IG icon badge */}
          <div
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: IG_GRADIENT }}
          >
            <Instagram size={17} color="white" />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-2.5 flex-wrap">
          <StatPill icon={Users} label="Followers" value={igProfile.followersCount} />
          <StatPill icon={UserCheck} label="Following" value={igProfile.followingCount} />
          <StatPill icon={Image} label="Posts" value={igProfile.mediaCount} />
        </div>

        {/* Last synced + actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
          {/* Last sync timestamp */}
          <div className="flex items-center gap-1.5 text-xs text-[#8E8E93]">
            <Clock size={12} />
            {igProfile.lastSyncAt
              ? `Synced ${formatDate(igProfile.lastSyncAt)}`
              : 'Not synced yet'}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {/* Sync button */}
            <button
              id="instagram-sync-btn"
              onClick={() => sync()}
              disabled={isSyncing || isDisconnecting}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-all duration-150',
                (isSyncing || isDisconnecting) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <RefreshCw size={12} className={cn(isSyncing && 'animate-spin')} />
              {isSyncing ? 'Syncing…' : 'Sync Now'}
            </button>

            {/* Disconnect link / confirm flow */}
            {!showDisconnectConfirm ? (
              <button
                id="instagram-disconnect-trigger"
                onClick={() => setShowDisconnectConfirm(true)}
                disabled={isSyncing || isDisconnecting}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#8E8E93] hover:text-red-400 transition-colors disabled:opacity-40"
              >
                <Unlink size={12} />
                Disconnect
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#8E8E93]">Are you sure?</span>
                <button
                  id="instagram-disconnect-confirm"
                  onClick={() => {
                    disconnect();
                    setShowDisconnectConfirm(false);
                  }}
                  disabled={isDisconnecting}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors"
                >
                  {isDisconnecting ? 'Disconnecting…' : 'Yes, disconnect'}
                </button>
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="text-[11px] font-bold text-[#8E8E93] hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramConnectCard;
