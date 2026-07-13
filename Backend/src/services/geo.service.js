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

module.exports = {
  geocodePincode,
};
