const { supabaseAdmin } = require('./supabase');
const AppError = require('../utils/AppError');

/**
 * Resolves a PIN code to coordinates via the seeded `pincodes` lookup table.
 * Extension seam: swap this body for a real geocoding provider call later —
 * every call site just awaits { pincode, latitude, longitude, city }.
 */
const geocodePincode = async (pincode) => {
  const { data, error } = await supabaseAdmin
    .from('pincodes')
    .select('pincode, city, latitude, longitude')
    .eq('pincode', pincode)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to resolve PIN code.', 500, 'DATABASE_ERROR');
  }

  if (!data) {
    throw new AppError('We currently support Pune PIN codes only.', 400, 'UNSUPPORTED_PINCODE');
  }

  return data;
};

/**
 * Great-circle distance in km, rounded to the nearest 0.5. JS mirror of the
 * haversine_km Postgres function (migrations/schema.sql) for call sites
 * that already have both points in hand and don't need a DB round-trip.
 */
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(r * 2 * Math.asin(Math.sqrt(a)) * 2) / 2;
};

module.exports = {
  geocodePincode,
  haversineKm,
};
