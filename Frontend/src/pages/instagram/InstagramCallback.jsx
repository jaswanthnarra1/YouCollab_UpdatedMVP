import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Instagram } from 'lucide-react';
import { useInstagram } from '../../hooks/useInstagram';

/**
 * InstagramCallback — /instagram/callback
 * =========================================
 * This page is the OAuth redirect target. Meta redirects back here with
 * ?code=...&state=... after the user authorises on Meta's consent page.
 *
 * On mount it automatically calls the backend callback endpoint, then
 * redirects to the influencer dashboard after a short delay.
 */
const InstagramCallback = () => {
  const navigate = useNavigate();
  const { handleCallback, isHandlingCallback, callbackSuccess, callbackError } = useInstagram();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return; // StrictMode double-invoke guard
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error || !code) {
      // Meta returned an error or user denied permission
      return;
    }

    handleCallback({ code, state });
  }, [handleCallback]);

  useEffect(() => {
    if (callbackSuccess) {
      const timer = setTimeout(() => {
        navigate('/dashboard/influencer', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [callbackSuccess, navigate]);

  const params = new URLSearchParams(window.location.search);
  const metaError = params.get('error_description') || params.get('error');
  const isDenied = !!metaError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-6 text-center px-6 max-w-sm w-full">

        {/* Instagram gradient icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
          }}
        >
          <Instagram size={32} color="white" />
        </div>

        {/* Loading state */}
        {isHandlingCallback && !isDenied && (
          <>
            <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
            <div>
              <h1 className="text-xl font-bold text-white">Connecting Instagram</h1>
              <p className="text-sm text-[#8E8E93] mt-1">Verifying your account with Meta…</p>
            </div>
          </>
        )}

        {/* Success state */}
        {callbackSuccess && (
          <>
            <CheckCircle size={48} className="text-emerald-400" strokeWidth={1.5} />
            <div>
              <h1 className="text-xl font-bold text-white">Instagram Connected! 🎉</h1>
              <p className="text-sm text-[#8E8E93] mt-1">Redirecting you to your dashboard…</p>
            </div>
          </>
        )}

        {/* Error / denied state */}
        {(callbackError || isDenied) && (
          <>
            <XCircle size={48} className="text-red-400" strokeWidth={1.5} />
            <div>
              <h1 className="text-xl font-bold text-white">Connection Failed</h1>
              <p className="text-sm text-[#8E8E93] mt-1">
                {metaError || 'Something went wrong. Please try again from your dashboard.'}
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/influencer', { replace: true })}
              className="text-sm font-semibold text-white/60 hover:text-white transition-colors underline underline-offset-4"
            >
              Go back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InstagramCallback;
