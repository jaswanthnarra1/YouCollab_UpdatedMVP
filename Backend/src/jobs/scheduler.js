const config = require('../config');
const gigService = require('../services/gig.service');
const instagramService = require('../services/instagram.service');
const planService = require('../services/plan.service');
const logger = require('../utils/logger');

/**
 * Background sweeps.
 *
 * Deliberately setInterval inside the Express process rather than node-cron or
 * an external worker: this app deploys as a single container (Dockerfile →
 * Railway), so there is no separate worker process to schedule into, and adding
 * a cron dependency buys nothing over an interval at this cadence.
 *
 * Correctness does not depend on the sweep running on time — expiry is also
 * enforced on read (list_gigs_in_radius) and on write (application.service
 * apply()). The sweep exists to keep `status` truthful for listings and badges,
 * not to be the gate.
 *
 * ponytail: single-process interval. If the app is ever scaled to multiple
 * instances every instance will run its own sweep — harmless today because the
 * UPDATE is idempotent and guarded by its WHERE clause, but the upgrade path is
 * a Postgres advisory lock or an external scheduler.
 */

let timer = null;
let igRefreshTimer = null;
let billingRenewalTimer = null;

const runExpirySweep = async () => {
  try {
    const { expired } = await gigService.expireLapsedGigs();
    if (expired > 0) {
      console.log(`[scheduler] Expired ${expired} lapsed gig(s).`);
    }
  } catch (err) {
    // Never let a sweep failure take the process down.
    console.error('[scheduler] Expiry sweep failed:', err.message);
  }
};

/**
 * Daily(-ish) sweep: refreshes any CONNECTED Instagram account's token that's
 * within INSTAGRAM.REFRESH_BEFORE_EXPIRY_DAYS of expiring, so a creator who
 * never manually hits "Sync" doesn't silently lose their connection. Accounts
 * where the refresh permanently fails are flagged RECONNECT_REQUIRED by the
 * service itself — this sweep just needs to run and not crash the process.
 */
const runIgTokenRefreshSweep = async () => {
  try {
    const result = await instagramService.refreshExpiringTokens();
    if (result.checked > 0) {
      logger.info(result, '[scheduler] Instagram token refresh sweep complete');
    }
  } catch (err) {
    logger.error({ err: err.message }, '[scheduler] Instagram token refresh sweep failed');
  }
};

/**
 * Rolls forward any brand whose 30-day billing cycle has elapsed (unused
 * Campaign Credits/Application Slots + the plan's fresh grant — see
 * plan.service.js renewElapsedBillingCycles). No payment collection here;
 * V1 has no billing provider, this is purely the credit/slot bookkeeping.
 */
const runBillingRenewalSweep = async () => {
  try {
    const { renewed } = await planService.renewElapsedBillingCycles();
    if (renewed > 0) {
      console.log(`[scheduler] Renewed billing cycle for ${renewed} brand(s).`);
    }
  } catch (err) {
    console.error('[scheduler] Billing renewal sweep failed:', err.message);
  }
};

const start = () => {
  if (timer) return timer;

  const everyMs = config.GIG.EXPIRY_SWEEP_MINUTES * 60 * 1000;

  // Run once at boot so a container restart immediately reconciles anything
  // that lapsed while the process was down.
  runExpirySweep();

  timer = setInterval(runExpirySweep, everyMs);
  // Don't hold the event loop open on shutdown.
  if (timer.unref) timer.unref();

  console.log(`[scheduler] Gig expiry sweep every ${config.GIG.EXPIRY_SWEEP_MINUTES}m (validity ${config.GIG.VALIDITY_DAYS}d).`);

  const igEveryMs = config.INSTAGRAM.REFRESH_SWEEP_HOURS * 60 * 60 * 1000;
  runIgTokenRefreshSweep();
  igRefreshTimer = setInterval(runIgTokenRefreshSweep, igEveryMs);
  if (igRefreshTimer.unref) igRefreshTimer.unref();

  console.log(`[scheduler] Instagram token refresh sweep every ${config.INSTAGRAM.REFRESH_SWEEP_HOURS}h.`);

  const billingEveryMs = config.BILLING.RENEWAL_SWEEP_HOURS * 60 * 60 * 1000;
  runBillingRenewalSweep();
  billingRenewalTimer = setInterval(runBillingRenewalSweep, billingEveryMs);
  if (billingRenewalTimer.unref) billingRenewalTimer.unref();

  console.log(`[scheduler] Billing renewal sweep every ${config.BILLING.RENEWAL_SWEEP_HOURS}h.`);

  return timer;
};

const stop = () => {
  if (timer) clearInterval(timer);
  timer = null;
  if (igRefreshTimer) clearInterval(igRefreshTimer);
  igRefreshTimer = null;
  if (billingRenewalTimer) clearInterval(billingRenewalTimer);
  billingRenewalTimer = null;
};

module.exports = { start, stop, runExpirySweep, runIgTokenRefreshSweep, runBillingRenewalSweep };
