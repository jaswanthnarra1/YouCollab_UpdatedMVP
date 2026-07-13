-- ============================================
-- YouCollab Enhanced Schema for Supabase
-- ============================================
-- Run this AFTER migration.sql to add:
--   • auth_id linkage to Supabase Auth
--   • messages table for brand-influencer DMs
--   • reviews table for post-collaboration ratings
--   • Proper Row Level Security policies
--   • Storage bucket policies
--   • Additional performance indexes
-- ============================================

-- ============================================
-- 1. Link users table to Supabase Auth
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS "authId" UUID UNIQUE;

-- Index for fast auth_id lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users("authId");

-- ============================================
-- 1a. Notification / privacy preferences (Settings screen)
-- ============================================
-- Server-side storage so preferences survive across devices/logout, instead
-- of the localStorage-only settings that used to make Settings toggles a
-- no-op the moment you opened the app on a different device.

ALTER TABLE users ADD COLUMN IF NOT EXISTS "notificationPrefs" JSONB NOT NULL DEFAULT '{
  "email": true,
  "appUpdates": true,
  "collabs": true,
  "messages": true,
  "marketing": false,
  "digest": true
}'::jsonb;

ALTER TABLE users ADD COLUMN IF NOT EXISTS "privacyPrefs" JSONB NOT NULL DEFAULT '{
  "publicProfile": true,
  "showFollowers": true,
  "showContact": false,
  "discoverable": true,
  "searchVisible": true
}'::jsonb;

-- ============================================
-- 1b. Brand trial credits (one-time 500-credit pack)
-- ============================================

ALTER TABLE brands ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 500;

-- Creators also get a 500-credit trial pack on signup (same as brands),
-- on top of whatever they later earn from being hired.
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE influencers ALTER COLUMN credits SET DEFAULT 500;

-- Atomic credit debit/credit — the UPDATE reads and writes the balance in a
-- single statement, so two concurrent hires for the same brand/creator can't
-- lose one write to the other the way a JS-side read-then-write would.
CREATE OR REPLACE FUNCTION debit_brand_credits(p_brand_id UUID, p_amount INTEGER)
RETURNS TABLE(credits INTEGER) AS $$
  UPDATE brands SET credits = credits - p_amount
  WHERE id = p_brand_id AND credits >= p_amount
  RETURNING credits;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION credit_influencer_earnings(p_influencer_id UUID, p_amount INTEGER)
RETURNS TABLE(credits INTEGER) AS $$
  UPDATE influencers SET credits = credits + p_amount
  WHERE id = p_influencer_id
  RETURNING credits;
$$ LANGUAGE sql;

-- Refund path for debit_brand_credits (e.g. gig posting charged but the gig
-- insert itself then failed) — symmetric to credit_influencer_earnings.
CREATE OR REPLACE FUNCTION credit_brand_credits(p_brand_id UUID, p_amount INTEGER)
RETURNS TABLE(credits INTEGER) AS $$
  UPDATE brands SET credits = credits + p_amount
  WHERE id = p_brand_id
  RETURNING credits;
$$ LANGUAGE sql;

-- ============================================
-- 2. Messages Table (Brand-Influencer DMs)
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "senderId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "receiverId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "applicationId" UUID REFERENCES applications(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages("senderId");
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages("receiverId");
CREATE INDEX IF NOT EXISTS idx_messages_application ON messages("applicationId");
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON messages("receiverId", "isRead");
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages("createdAt");

-- ============================================
-- 3. Reviews Table (Post-Collaboration Ratings)
-- ============================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId" UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  "reviewerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "revieweeId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews("reviewerId");
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews("revieweeId");
CREATE INDEX IF NOT EXISTS idx_reviews_application ON reviews("applicationId");

-- ============================================
-- 4. Additional Performance Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands("userId");
CREATE INDEX IF NOT EXISTS idx_influencers_user_id ON influencers("userId");
CREATE INDEX IF NOT EXISTS idx_applications_gig_id ON applications("gigId");
CREATE INDEX IF NOT EXISTS idx_applications_influencer_id ON applications("influencerId");
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_gigs_brand_id ON gigs("brandId");
CREATE INDEX IF NOT EXISTS idx_gigs_deadline ON gigs(deadline);

-- ============================================
-- 5. Enhanced Row Level Security
-- ============================================
-- NOTE: Since the Express backend manages its own auth via JWT and uses
-- the anon key, we keep permissive policies for the anon role.
-- When/if the app migrates to direct Supabase Auth from the frontend,
-- these policies should be tightened to scope by auth.uid().

-- Enable RLS on new tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policies for messages
CREATE POLICY "anon_all_messages" ON messages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_messages" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for reviews
CREATE POLICY "anon_all_reviews" ON reviews FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_reviews" ON reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant permissions on new tables
GRANT ALL ON messages TO anon, authenticated;
GRANT ALL ON reviews TO anon, authenticated;

-- ============================================
-- 6. Enable Realtime for key tables
-- ============================================
-- These need to be enabled in Supabase Dashboard → Database → Replication
-- OR via the following SQL (requires superuser/service_role):

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE applications;
ALTER PUBLICATION supabase_realtime ADD TABLE gigs;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================
-- 7. Storage Bucket Setup
-- ============================================
-- Creates public storage buckets for file uploads.
-- These are idempotent — safe to run multiple times.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('gig-media', 'gig-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Allow public read, authenticated upload
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Anon upload avatars" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anon delete avatars" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Public read gig-media" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'gig-media');

CREATE POLICY "Anon upload gig-media" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'gig-media');

CREATE POLICY "Anon delete gig-media" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'gig-media');

-- ============================================
-- 8. Utility RPC: Get user stats
-- ============================================

CREATE OR REPLACE FUNCTION get_user_stats(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalGigs', (SELECT COUNT(*) FROM gigs g JOIN brands b ON g."brandId" = b.id WHERE b."userId" = target_user_id),
    'totalApplications', (SELECT COUNT(*) FROM applications a JOIN influencers i ON a."influencerId" = i.id WHERE i."userId" = target_user_id),
    'acceptedApplications', (SELECT COUNT(*) FROM applications a JOIN influencers i ON a."influencerId" = i.id WHERE i."userId" = target_user_id AND a.status = 'ACCEPTED'),
    'averageRating', (SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0) FROM reviews WHERE "revieweeId" = target_user_id),
    'totalReviews', (SELECT COUNT(*) FROM reviews WHERE "revieweeId" = target_user_id),
    'unreadNotifications', (SELECT COUNT(*) FROM notifications WHERE "userId" = target_user_id AND "isRead" = false),
    'unreadMessages', (SELECT COUNT(*) FROM messages WHERE "receiverId" = target_user_id AND "isRead" = false)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO anon, authenticated;

-- ============================================
-- 9. Clerk authentication linkage
-- ============================================
-- Auth moved from Supabase Auth + app JWTs to Clerk. passwordHash/authId are
-- no longer written on new signups (Clerk owns credentials) but are kept for
-- any rows created under the old system. clerk_user_id/full_name already
-- existed on the live DB from an earlier, never-committed Clerk attempt —
-- reused here rather than adding a duplicate camelCase column.

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
ALTER TABLE users ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Pre-existing bug found while wiring Clerk: the live `users` table (created
-- outside migration.sql, see note above) uses snake_case timestamp columns,
-- but its updated-at trigger reused the shared update_updated_at_column()
-- function, which sets the camelCase "updatedAt" — so every UPDATE on users
-- errored with 42703 "record new has no field updatedAt". Give users its own
-- trigger function targeting the column it actually has.
CREATE OR REPLACE FUNCTION update_users_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_users_updated_at_column();

-- ============================================
-- 10. Location Radius Matching
-- ============================================
-- PIN-code-derived coordinates for brands/creators, an optional radius on
-- gigs, and a Postgres-side haversine RPC to filter+rank the feed by
-- distance. No PostGIS/earthdistance extension — plain great-circle math is
-- accurate enough at city scale and keeps this dependency-free.

-- Offline PIN -> coordinates lookup (MVP scope: Pune 411xxx only). A real
-- geocoding provider can replace this table's role later without touching
-- call sites — see geocodePincode() in Backend/src/services/geo.service.js.
CREATE TABLE IF NOT EXISTS pincodes (
  pincode TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pincodes_city ON pincodes(city);

INSERT INTO pincodes (pincode, city, latitude, longitude) VALUES
  ('411001', 'Pune', 18.5196, 73.8553),
  ('411002', 'Pune', 18.5157, 73.8560),
  ('411003', 'Pune', 18.5310, 73.8446),
  ('411004', 'Pune', 18.5089, 73.8258),
  ('411005', 'Pune', 18.5304, 73.8567),
  ('411006', 'Pune', 18.5089, 73.8515),
  ('411007', 'Pune', 18.5590, 73.8080),
  ('411008', 'Pune', 18.5062, 73.8298),
  ('411009', 'Pune', 18.5245, 73.8397),
  ('411011', 'Pune', 18.4870, 73.8890),
  ('411013', 'Pune', 18.5000, 73.8890),
  ('411014', 'Pune', 18.5470, 73.9020),
  ('411016', 'Pune', 18.5162, 73.8455),
  ('411017', 'Pune', 18.4700, 73.8600),
  ('411018', 'Pune', 18.5560, 73.8850),
  ('411021', 'Pune', 18.5810, 73.8180),
  ('411027', 'Pune', 18.4780, 73.7930),
  ('411028', 'Pune', 18.4640, 73.8930),
  ('411029', 'Pune', 18.4890, 73.8150),
  ('411030', 'Pune', 18.5074, 73.8077),
  ('411032', 'Pune', 18.4990, 73.7950),
  ('411033', 'Pune', 18.5760, 73.8940),
  ('411036', 'Pune', 18.5089, 73.9260),
  ('411037', 'Pune', 18.5350, 73.9330),
  ('411038', 'Pune', 18.5590, 73.7868),
  ('411040', 'Pune', 18.5220, 73.7770),
  ('411041', 'Pune', 18.5780, 73.9720),
  ('411042', 'Pune', 18.4590, 73.9070),
  ('411043', 'Pune', 18.4630, 73.8930),
  ('411044', 'Pune', 18.4530, 73.8670),
  ('411045', 'Pune', 18.5670, 73.9143),
  ('411046', 'Pune', 18.5362, 73.8938),
  ('411048', 'Pune', 18.4610, 73.8790),
  ('411052', 'Pune', 18.6280, 73.8010),
  ('411057', 'Pune', 18.5980, 73.7630),
  ('411058', 'Pune', 18.5910, 73.7380)
ON CONFLICT (pincode) DO NOTHING;

-- Denormalized coordinates on brands/influencers, resolved once at
-- onboarding/profile-edit time via geo.service.js rather than per query.
ALTER TABLE brands ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE influencers ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_brands_lat_lng ON brands(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_influencers_lat_lng ON influencers(latitude, longitude);

-- Optional match radius on a gig. NULL means "Anywhere in Pune" — every
-- pre-existing gig defaults to this, so nothing that worked before changes.
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS "radiusKm" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gigs_radiuskm_check'
  ) THEN
    ALTER TABLE gigs ADD CONSTRAINT gigs_radiuskm_check
      CHECK ("radiusKm" IS NULL OR "radiusKm" IN (2, 5, 10, 20));
  END IF;
END $$;

-- Great-circle distance in km between two lat/lng points. Plain formula, no
-- extension required — accurate to well within city-block scale at Pune's
-- latitude, which is all this feature needs.
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  r DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION := radians(lat2 - lat1);
  dlng DOUBLE PRECISION := radians(lng2 - lng1);
  a DOUBLE PRECISION;
BEGIN
  a := sin(dlat / 2) ^ 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ^ 2;
  RETURN r * 2 * asin(sqrt(a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Marketplace feed with radius matching baked in. Mirrors gig.service.js's
-- getGigs exactly: same status/city/category/search filters, same sort
-- modes and keyset cursor semantics (caller resolves the cursor row's sort
-- value in JS first, same as today, and just passes it in here), same
-- LIMIT n+1 has-more convention. The only addition is the radius visibility
-- rule and a rounded distanceKm per row.
--
-- Null-handling matrix (see PRD):
--   radiusKm IS NULL              -> visible to everyone ("Anywhere in Pune")
--   brand has no coordinates      -> degrades to NULL-radius (visible to all)
--   creator has no coordinates    -> radius-restricted gigs are excluded
--   otherwise                     -> visible iff haversine_km(...) <= radiusKm
--
-- p_sort = 'nearest' orders by distance_km ascending (closest first); rows
-- with no computable distance (brand has no coordinates) sort last via the
-- 999999 sentinel, used in both the ORDER BY and the cursor comparison so
-- keyset pagination doesn't hit NULL-tuple comparison pitfalls.
DROP FUNCTION IF EXISTS list_gigs_in_radius(TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE OR REPLACE FUNCTION list_gigs_in_radius(
  p_category TEXT,
  p_search TEXT,
  p_sort TEXT,
  p_cursor_budget_min INTEGER,
  p_cursor_created_at TIMESTAMPTZ,
  p_cursor_distance_km DOUBLE PRECISION,
  p_cursor_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_limit INTEGER
)
RETURNS TABLE (
  id UUID,
  "brandId" UUID,
  title TEXT,
  description TEXT,
  "budgetMin" INTEGER,
  "budgetMax" INTEGER,
  deliverables TEXT,
  "creatorRequirements" TEXT,
  platform TEXT,
  "campaignType" TEXT,
  deadline TIMESTAMPTZ,
  status TEXT,
  city TEXT,
  category TEXT,
  "radiusKm" INTEGER,
  "viewCount" INTEGER,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ,
  brand_id UUID,
  brand_business_name TEXT,
  brand_category TEXT,
  brand_logo_url TEXT,
  brand_last_active_at TIMESTAMPTZ,
  applications_count INTEGER,
  distance_km DOUBLE PRECISION,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT
      g.id, g."brandId", g.title, g.description, g."budgetMin", g."budgetMax",
      g.deliverables, g."creatorRequirements", g.platform, g."campaignType", g.deadline,
      g.status, g.city, g.category, g."radiusKm", g."viewCount", g."createdAt", g."updatedAt",
      b.id AS brand_id, b."businessName" AS brand_business_name, b.category AS brand_category,
      b."logoUrl" AS brand_logo_url, u.last_active_at AS brand_last_active_at,
      COALESCE(a.cnt, 0)::INTEGER AS applications_count,
      CASE
        WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
        THEN ROUND((haversine_km(b.latitude, b.longitude, p_lat, p_lng) * 2)::numeric)::double precision / 2
        ELSE NULL
      END AS distance_km
    FROM gigs g
    JOIN brands b ON b.id = g."brandId"
    JOIN users u ON u.id = b."userId"
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM applications ap WHERE ap."gigId" = g.id
    ) a ON true
    WHERE g.status = 'OPEN' AND g.city = 'Pune'
      AND (p_category IS NULL OR g.category = p_category)
      AND (p_search IS NULL OR g.title ILIKE '%' || p_search || '%' OR g.description ILIKE '%' || p_search || '%')
      AND (
        g."radiusKm" IS NULL
        OR b.latitude IS NULL OR b.longitude IS NULL
        OR (p_lat IS NOT NULL AND p_lng IS NOT NULL AND haversine_km(b.latitude, b.longitude, p_lat, p_lng) <= g."radiusKm")
      )
  ),
  counted AS (
    SELECT COUNT(*) AS total FROM filtered
  )
  SELECT f.*, counted.total
  FROM filtered f, counted
  WHERE
    CASE
      WHEN p_sort = 'budget_high' THEN (p_cursor_id IS NULL OR (f."budgetMin", f.id) < (p_cursor_budget_min, p_cursor_id))
      WHEN p_sort = 'budget_low' THEN (p_cursor_id IS NULL OR (f."budgetMin", f.id) > (p_cursor_budget_min, p_cursor_id))
      WHEN p_sort = 'nearest' THEN (p_cursor_id IS NULL OR (COALESCE(f.distance_km, 999999), f.id) > (COALESCE(p_cursor_distance_km, 999999), p_cursor_id))
      ELSE (p_cursor_id IS NULL OR (f."createdAt", f.id) < (p_cursor_created_at, p_cursor_id))
    END
  ORDER BY
    CASE WHEN p_sort = 'budget_high' THEN f."budgetMin" END DESC NULLS LAST,
    CASE WHEN p_sort = 'budget_low' THEN f."budgetMin" END ASC NULLS LAST,
    CASE WHEN p_sort = 'nearest' THEN COALESCE(f.distance_km, 999999) END ASC NULLS LAST,
    CASE WHEN p_sort IS NULL OR p_sort NOT IN ('budget_high', 'budget_low', 'nearest') THEN f."createdAt" END DESC NULLS LAST,
    CASE WHEN p_sort = 'budget_high' THEN f.id END DESC,
    CASE WHEN p_sort = 'budget_low' THEN f.id END ASC,
    CASE WHEN p_sort = 'nearest' THEN f.id END ASC,
    f.id DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION list_gigs_in_radius(TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, DOUBLE PRECISION, UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION haversine_km(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated;
