const config = require('../config');
const gigService = require('../services/gig.service');

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
  return timer;
};

const stop = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

module.exports = { start, stop, runExpirySweep };
