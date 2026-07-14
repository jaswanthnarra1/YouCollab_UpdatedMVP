const { supabaseAdmin } = require('./supabase');
const AppError = require('../utils/AppError');

const NEARBY_LIMIT = 5;

/**
 * Looks up the requesting user's own stored coordinates for either role.
 * Coordinates never leave the server — only used to rank the RPC results.
 */
const getOwnCoords = async (user) => {
  const table = user.role === 'BRAND' ? 'brands' : 'influencers';
  const { data } = await supabaseAdmin
    .from(table)
    .select('latitude, longitude')
    .eq('userId', user.id)
    .maybeSingle();

  return { latitude: data?.latitude ?? null, longitude: data?.longitude ?? null };
};

/**
 * Nearest counterpart profiles for the dashboard widget — creators for a
 * brand, brands for a creator — ranked by distance from the requester's
 * own PIN code. Returns an empty list if they haven't set one.
 */
const getNearby = async (user) => {
  const type = user.role === 'BRAND' ? 'creators' : 'brands';
  const { latitude, longitude } = await getOwnCoords(user);
  const locationEnabled = latitude != null && longitude != null;

  if (!locationEnabled) {
    return { type, items: [], locationEnabled };
  }

  const rpcName = user.role === 'BRAND' ? 'list_nearest_influencers' : 'list_nearest_brands';
  const { data: rows, error } = await supabaseAdmin.rpc(rpcName, {
    p_lat: latitude,
    p_lng: longitude,
    p_limit: NEARBY_LIMIT,
  });

  if (error) {
    throw new AppError('Failed to fetch nearby profiles.', 500, 'DATABASE_ERROR');
  }

  const items = (rows || []).map((row) =>
    user.role === 'BRAND'
      ? {
          id: row.id,
          name: row.name,
          instagramHandle: row.instagramHandle,
          niche: row.niche,
          profileImageUrl: row.profileImageUrl,
          followerCount: row.followerCount,
          distanceKm: row.distance_km,
        }
      : {
          id: row.id,
          businessName: row.businessName,
          category: row.category,
          logoUrl: row.logoUrl,
          location: row.location,
          distanceKm: row.distance_km,
        }
  );

  return { type, items, locationEnabled };
};

module.exports = {
  getNearby,
};
