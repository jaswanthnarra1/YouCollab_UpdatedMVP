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
    -- ACTIVE replaces the old OPEN status (see section 14). Expired gigs are
    -- excluded from discovery here as well as by the scheduler, so a gig that
    -- lapses between sweeps still disappears from the feed immediately.
    -- A gig that has already filled every application slot is excluded the
    -- same way — otherwise it keeps showing a live "Pitch now" button that
    -- deterministically fails every attempt with CAPACITY_REACHED.
    WHERE g.status = 'ACTIVE'
      AND (g."expiresAt" IS NULL OR g."expiresAt" > now())
      AND COALESCE(a.cnt, 0) < g."applicationSlots"
      AND g.city = 'Pune'
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

-- ============================================
-- 13. users.phone (Clerk phone + SMS OTP auth)
-- ============================================
-- Auth is Clerk phone number + SMS OTP for direct sign-up, plus Google OAuth
-- (email-based) kept alongside it — see Backend/src/services/auth.service.js
-- findOrCreateByClerkId(), which links/creates users by whichever of
-- email/phone the Clerk identity carries. email is nullable because phone
-- sign-ups have none; phone is nullable because Google sign-ups have none.

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Partial unique index rather than a UNIQUE constraint: pre-existing rows all
-- have phone = NULL, and Postgres UNIQUE would otherwise be fine with that but
-- this also documents that only non-null phones must be distinct.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- ============================================
-- 14. Gig lifecycle + plans + application slots
-- ============================================

-- --- 14a. Gig lifecycle ---------------------------------------------------
-- Statuses go from OPEN/CLOSED to DRAFT/ACTIVE/EXPIRED/CLOSED.
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMPTZ;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS "expiresAt"   TIMESTAMPTZ;
-- Per-campaign application capacity. 1 is the floor the PRD mandates for any
-- active campaign, so it's also the safe default for rows created before slots.
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS "applicationSlots" INTEGER NOT NULL DEFAULT 1;

-- Backfill existing rows: OPEN becomes ACTIVE, CLOSED stays CLOSED.
UPDATE gigs SET status = 'ACTIVE' WHERE status = 'OPEN';

-- Existing gigs get their original creation time as publishedAt, but a *fresh*
-- 14 days of runway measured from now. Using createdAt + 14d would retroactively
-- expire every historical gig the moment this migration lands, which is data
-- loss in spirit even though no row is deleted.
UPDATE gigs SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL AND status <> 'DRAFT';
UPDATE gigs SET "expiresAt" = now() + INTERVAL '14 days'
  WHERE "expiresAt" IS NULL AND status = 'ACTIVE';

-- Never leave an existing gig with fewer slots than applications it already
-- received, or it would start life over capacity.
UPDATE gigs g SET "applicationSlots" = GREATEST(1, (
  SELECT COUNT(*) FROM applications a WHERE a."gigId" = g.id
));

ALTER TABLE gigs DROP CONSTRAINT IF EXISTS gigs_status_check;
ALTER TABLE gigs ADD CONSTRAINT gigs_status_check
  CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'CLOSED'));
ALTER TABLE gigs DROP CONSTRAINT IF EXISTS gigs_application_slots_check;
ALTER TABLE gigs ADD CONSTRAINT gigs_application_slots_check
  CHECK ("applicationSlots" >= 1);

CREATE INDEX IF NOT EXISTS idx_gigs_status_expires ON gigs(status, "expiresAt");

-- --- 14b. Subscription plans ----------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT UNIQUE NOT NULL,
  price                  INTEGER NOT NULL DEFAULT 0,
  "campaignLimit"        INTEGER NOT NULL,
  "applicationSlotLimit" INTEGER NOT NULL,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans (name, price, "campaignLimit", "applicationSlotLimit") VALUES
  ('FREE',    0,  2,  12),
  ('STARTER', 99, 5,  36),
  ('GROWTH',  299, 10, 64)
ON CONFLICT (name) DO NOTHING;

-- Every brand starts on FREE; plan values are read from this table, never
-- hardcoded in app code.
ALTER TABLE brands ADD COLUMN IF NOT EXISTS "planId" UUID REFERENCES plans(id);
UPDATE brands SET "planId" = (SELECT id FROM plans WHERE name = 'FREE')
  WHERE "planId" IS NULL;

CREATE INDEX IF NOT EXISTS idx_brands_plan_id ON brands("planId");

-- --- 14c. Atomic capacity-checked application insert -----------------------
-- The JS-side capacity check in application.service.js is a read-then-write and
-- cannot hold under concurrency: two simultaneous applications can both read
-- "7 of 8 used" and both insert. Locking the gig row here serializes them, the
-- same way debit_brand_credits serializes credit spends.
-- Returns 0 rows when the gig is at capacity, so the caller can distinguish
-- "full" from "inserted" without a second query.
CREATE OR REPLACE FUNCTION insert_application_with_capacity(
  p_gig_id        UUID,
  p_influencer_id UUID,
  p_cover_note    TEXT
)
RETURNS SETOF applications AS $$
DECLARE
  v_slots    INTEGER;
  v_received INTEGER;
BEGIN
  -- FOR UPDATE makes concurrent applicants to the same gig queue up here.
  SELECT "applicationSlots" INTO v_slots
  FROM gigs WHERE id = p_gig_id FOR UPDATE;

  IF v_slots IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_received FROM applications WHERE "gigId" = p_gig_id;

  IF v_received >= v_slots THEN
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO applications ("gigId", "influencerId", "coverNote", status)
  VALUES (p_gig_id, p_influencer_id, p_cover_note, 'PENDING')
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION insert_application_with_capacity(UUID, UUID, TEXT) TO anon, authenticated;

-- Plans are read through the anon key like every other table in this app, so
-- they need the same grant the other tables get in section 5. RLS is on by
-- default here, and with no policy the catalogue silently reads back *empty*
-- rather than erroring — so the policy is what actually makes plans visible.
-- Reads only: plan writes go through supabaseAdmin, which bypasses RLS.
GRANT ALL ON plans TO anon, authenticated;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 15. Drop phone auth (migrated to Email + Password + Email OTP)
-- ============================================
-- Auth is now Clerk email + password with email-code verification, plus
-- Google OAuth — see Backend/src/services/auth.service.js
-- findOrCreateByClerkId(), which links/creates users by email only.
DROP INDEX IF EXISTS idx_users_phone;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
CREATE POLICY "read_plans" ON plans FOR SELECT TO anon, authenticated USING (true);

-- ============================================
-- 16. Terms of Service / Privacy Policy acceptance
-- ============================================
-- snake_case, unquoted — matches is_onboarded/last_active_at/full_name, the
-- naming style the live users table actually uses (see section 9 note and
-- Backend/src/services/auth.service.js toProfile()), not the camelCase-quoted
-- style used by the later JSONB prefs columns above.
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accept_ip TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accept_browser TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accept_device TEXT;

-- ============================================
-- 17. Instagram connection — status tracking, account type, granted scopes
-- ============================================
-- camelCase-quoted, matching every other ig* column on influencers (set up
-- by instagram_migration.sql — see Backend/src/services/instagram.service.js).
-- igAccessToken already exists; its *contents* changed from plaintext to
-- AES-256-GCM ciphertext (see Backend/src/utils/crypto.js) — no column
-- change needed for that, since no row currently has a token stored (verified
-- against the live DB before writing this migration).
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS "igAccountType" TEXT;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS "igPermissionsGranted" TEXT;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS "igLastRefreshAt" TIMESTAMPTZ;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS "igConnectionStatus" TEXT NOT NULL DEFAULT 'DISCONNECTED';
ALTER TABLE influencers ADD CONSTRAINT influencers_ig_connection_status_check
  CHECK ("igConnectionStatus" IN ('CONNECTED', 'RECONNECT_REQUIRED', 'DISCONNECTED'));

COMMENT ON COLUMN influencers."igAccountType"        IS 'BUSINESS or MEDIA_CREATOR from Graph API account_type — Personal accounts are rejected before this is ever set';
COMMENT ON COLUMN influencers."igPermissionsGranted" IS 'Comma-joined scopes actually granted at OAuth time';
COMMENT ON COLUMN influencers."igLastRefreshAt"      IS 'Timestamp of last successful access-token refresh (manual or scheduled sweep)';
COMMENT ON COLUMN influencers."igConnectionStatus"   IS 'CONNECTED / RECONNECT_REQUIRED (token refresh permanently failed) / DISCONNECTED';

-- ============================================
-- 18. Instagram display name
-- ============================================
-- The Graph API /me response already returns `name` (the account's display
-- name, distinct from the @username handle) and the service already requests
-- that field — it just had nowhere to land. The connected-state card shows
-- both, so persist it.
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS "igName" TEXT;

COMMENT ON COLUMN influencers."igName" IS 'Instagram account display name from Graph API `name` — distinct from igUsername (the @handle)';

-- ============================================
-- 19. Fix instagramHandle NOT NULL trap on upsert
-- ============================================
-- "instagramHandle" TEXT NOT NULL has no DEFAULT (migration.sql). Onboarding
-- deliberately omits it from its upsert (Meta is the sole source of truth for
-- it, per section 17/18) — but Postgres validates NOT NULL on the proposed
-- row for EVERY upsert, insert-or-update, before conflict resolution runs.
-- Any upsert that omits this column throws 23502, even when the row already
-- exists and the statement resolves to an UPDATE. Confirmed live: this broke
-- creator onboarding entirely (every "Finish setup" failed with "Failed to
-- create creator profile."). A DEFAULT closes the gap for every current and
-- future call site, not just onboarding's.
ALTER TABLE influencers ALTER COLUMN "instagramHandle" SET DEFAULT '';

-- ============================================
-- 20. Reel submission on Gig application
-- ============================================
-- Nullable, no default needed — validation-layer required only (see the
-- instagramHandle NOT NULL/upsert lesson in section 19). Existing rows and
-- any future write path that omits this column stay safe.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "reelUrl" TEXT;

-- CREATE OR REPLACE does not cover an added parameter — drop the 3-arg
-- overload first so it doesn't linger alongside the new 4-arg version.
DROP FUNCTION IF EXISTS insert_application_with_capacity(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION insert_application_with_capacity(
  p_gig_id        UUID,
  p_influencer_id UUID,
  p_cover_note    TEXT,
  p_reel_url      TEXT DEFAULT NULL
)
RETURNS SETOF applications AS $$
DECLARE
  v_slots    INTEGER;
  v_received INTEGER;
BEGIN
  SELECT "applicationSlots" INTO v_slots FROM gigs WHERE id = p_gig_id FOR UPDATE;
  IF v_slots IS NULL THEN RETURN; END IF;
  SELECT COUNT(*) INTO v_received FROM applications WHERE "gigId" = p_gig_id;
  IF v_received >= v_slots THEN RETURN; END IF;

  RETURN QUERY
  INSERT INTO applications ("gigId", "influencerId", "coverNote", "reelUrl", status)
  VALUES (p_gig_id, p_influencer_id, p_cover_note, p_reel_url, 'PENDING')
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION insert_application_with_capacity(UUID, UUID, TEXT, TEXT) TO anon, authenticated;

-- ============================================
-- 21. Creator Referral Program V1
-- ============================================
CREATE TABLE IF NOT EXISTS referral_submissions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "influencerId"       UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  "reelUrl"            TEXT NOT NULL,
  "instagramUsername"  TEXT,
  status               TEXT NOT NULL DEFAULT 'SUBMITTED',
  "verifiedViews"      INTEGER,
  "isWinner"           BOOLEAN NOT NULL DEFAULT false,
  "rewardAmount"       INTEGER,
  "reviewedBy"         TEXT,           -- admin's Clerk user id, audit trail only
  "reviewedAt"         TIMESTAMPTZ,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("influencerId", "reelUrl")
);

CREATE INDEX IF NOT EXISTS idx_referral_submissions_influencer ON referral_submissions("influencerId");
CREATE INDEX IF NOT EXISTS idx_referral_submissions_status ON referral_submissions(status);

-- At-most-one-global-winner, enforced at the DB level.
CREATE UNIQUE INDEX IF NOT EXISTS referral_one_winner_idx
  ON referral_submissions ("isWinner") WHERE "isWinner" = true;

DROP TRIGGER IF EXISTS update_referral_submissions_updated_at ON referral_submissions;
CREATE TRIGGER update_referral_submissions_updated_at
  BEFORE UPDATE ON referral_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE referral_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_referral_submissions" ON referral_submissions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_referral_submissions" ON referral_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON referral_submissions TO anon, authenticated;

-- ============================================
-- 22. Production RLS hardening — SEC-01
-- ============================================
-- This app never uses Supabase Auth (Clerk is the sole identity provider —
-- see CLAUDE.md), so the `authenticated` Postgres role is never reached by a
-- real per-user session, and every one of the `anon`/`authenticated` grants
-- and USING(true)/WITH CHECK(true) policies added across this file and
-- migration.sql exist for a caller that doesn't exist — while remaining
-- fully usable by anyone holding the public anon key (shipped as
-- VITE_SUPABASE_PUBLISHABLE_KEY) to read/write every table directly via
-- Supabase's REST API, completely bypassing the Express backend's
-- ownership/role checks (application.service.js, gig.service.js, etc.).
--
-- The backend's own Supabase client (Backend/supabase/client.js) now runs
-- exclusively as service_role, which bypasses RLS by design and is
-- unaffected by anything revoked here — this migration only removes access
-- that nothing legitimate was using.
--
-- Storage is the one deliberate exception: avatars/gig-media buckets are
-- created `public: true` (this file, ~line 181) specifically so images can
-- be rendered via direct public URLs in the UI — anon SELECT on
-- storage.objects for those two buckets is a verified, intentional
-- requirement and is left in place. Direct anon/authenticated INSERT/DELETE
-- on storage is not: every real upload already goes through
-- POST /api/upload (authenticate-gated, backend storage.js prefers
-- supabaseAdmin), so open write/delete access on storage.objects was a pure
-- bypass with no legitimate caller either.

-- Drop every USING(true)/WITH CHECK(true) policy that granted anon or
-- authenticated blanket access to application data.
DROP POLICY IF EXISTS "anon_all_users" ON users;
DROP POLICY IF EXISTS "auth_all_users" ON users;
DROP POLICY IF EXISTS "anon_all_brands" ON brands;
DROP POLICY IF EXISTS "auth_all_brands" ON brands;
DROP POLICY IF EXISTS "anon_all_influencers" ON influencers;
DROP POLICY IF EXISTS "auth_all_influencers" ON influencers;
DROP POLICY IF EXISTS "anon_all_gigs" ON gigs;
DROP POLICY IF EXISTS "auth_all_gigs" ON gigs;
DROP POLICY IF EXISTS "anon_all_applications" ON applications;
DROP POLICY IF EXISTS "auth_all_applications" ON applications;
DROP POLICY IF EXISTS "anon_all_refresh_tokens" ON refresh_tokens;
DROP POLICY IF EXISTS "auth_all_refresh_tokens" ON refresh_tokens;
DROP POLICY IF EXISTS "anon_all_notifications" ON notifications;
DROP POLICY IF EXISTS "auth_all_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_all_messages" ON messages;
DROP POLICY IF EXISTS "auth_all_messages" ON messages;
DROP POLICY IF EXISTS "anon_all_reviews" ON reviews;
DROP POLICY IF EXISTS "auth_all_reviews" ON reviews;
DROP POLICY IF EXISTS "read_plans" ON plans;
DROP POLICY IF EXISTS "anon_all_referral_submissions" ON referral_submissions;
DROP POLICY IF EXISTS "auth_all_referral_submissions" ON referral_submissions;

-- Storage: keep public read (verified requirement, see note above), drop
-- the anon/authenticated write/delete policies — nothing legitimate used them.
DROP POLICY IF EXISTS "Anon upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload gig-media" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete gig-media" ON storage.objects;

-- Revoke the blanket grants (migration.sql + this file) that made the
-- dropped policies reachable in the first place. This is the actual gate —
-- Postgres checks the base GRANT before RLS policies are even evaluated, so
-- this alone denies anon/authenticated regardless of any policy left
-- standing anywhere else in either migration file.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;
-- storage.objects INSERT/DELETE only — SELECT stays granted for the two
-- public buckets via the policies retained above.
REVOKE INSERT, UPDATE, DELETE ON storage.objects FROM anon, authenticated;

-- ============================================
-- 23. V1 Campaign Credit / Application Slot business model
-- ============================================
-- Replaces the old "brands.credits spent on both gig-posting (250) and
-- follower-tier hiring (100/300)" model. New rule, decided in the V1 PRD:
--   - Brands pay, Creators are free (no Creator credits are earned anymore).
--   - 1 Campaign Credit = 1 published Gig. Hiring costs nothing.
--   - Application Slots are a separate pool from Campaign Credits.
--   - Campaign Credits AND unused Application Slots roll over at renewal.
--   - Cancelling a published Gig within 1 hour refunds its Campaign Credit.
--
-- The old `brands.credits` / `influencers.credits` columns and the old
-- debit_brand_credits / credit_brand_credits / credit_influencer_earnings
-- functions are DEPRECATED, not dropped (Rule 6: no destructive ops on
-- production data without explicit justification; Rule 3: this migration
-- stops all *active* business logic from using them, so there is exactly
-- one authoritative credit model going forward — see application.service.js
-- and gig.service.js, which no longer call any of the three functions above
-- after this migration). They remain as inert historical/audit data.

-- --- 23a. Brand fields ------------------------------------------------------
ALTER TABLE brands ADD COLUMN IF NOT EXISTS "campaignCreditsRemaining" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS "applicationSlotsRemaining" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS "billingCycleStart" TIMESTAMPTZ;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS "billingCycleEnd" TIMESTAMPTZ;

ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_campaign_credits_check;
ALTER TABLE brands ADD CONSTRAINT brands_campaign_credits_check CHECK ("campaignCreditsRemaining" >= 0);
ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_slots_remaining_check;
ALTER TABLE brands ADD CONSTRAINT brands_slots_remaining_check CHECK ("applicationSlotsRemaining" >= 0);

-- --- 23b. Gig fields ---------------------------------------------------------
-- applicationSlotsAllotted reuses the existing "applicationSlots" column
-- (same meaning: total applications this campaign can accept) rather than
-- duplicating it — see gig.service.js, which now reads/writes
-- "applicationSlots" as the allotment.
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS "creditConsumed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS "creditRefunded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS "applicationSlotsUsed" INTEGER NOT NULL DEFAULT 0;
-- Idempotency guard so a repeated close/expire (double API call, or a close
-- followed by the expiry sweep on the same row) can never release the same
-- unused slots back to the brand's pool twice.
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS "slotsReleased" BOOLEAN NOT NULL DEFAULT false;

-- --- 23c. Credit ledger (audit history — NOT the source of truth) ----------
-- brands."campaignCreditsRemaining" remains the one authoritative balance.
-- This table exists purely so "why did my balance change" has an answer.
CREATE TABLE IF NOT EXISTS credit_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "brandId"       UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('PUBLISH', 'REFUND', 'RENEWAL', 'ADMIN_ADJUSTMENT')),
  amount          INTEGER NOT NULL, -- signed: -1 publish, +1 refund/renewal-per-credit, +/- admin
  "balanceBefore" INTEGER NOT NULL,
  "balanceAfter"  INTEGER NOT NULL,
  "gigId"         UUID REFERENCES gigs(id) ON DELETE SET NULL,
  reason          TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_brand ON credit_transactions("brandId", "createdAt" DESC);

-- --- 23d. Plan values, corrected to the V1 PRD ------------------------------
-- These columns already meant "how much this plan grants" under the old
-- model (a concurrency cap); under V1 the same columns mean "how much this
-- plan grants per billing cycle" (a rollover-able balance) — same shape,
-- reused rather than renamed (Rule 2).
UPDATE plans SET price = 0,   "campaignLimit" = 2,  "applicationSlotLimit" = 10 WHERE name = 'FREE';
UPDATE plans SET price = 99,  "campaignLimit" = 5,  "applicationSlotLimit" = 22 WHERE name = 'STARTER';
UPDATE plans SET price = 199, "campaignLimit" = 10, "applicationSlotLimit" = 48 WHERE name = 'GROWTH';
INSERT INTO plans (name, price, "campaignLimit", "applicationSlotLimit") VALUES
  ('FREE',    0,   2,  10),
  ('STARTER', 99,  5,  22),
  ('GROWTH',  199, 10, 48)
ON CONFLICT (name) DO NOTHING;

-- Any brand still missing a plan (should only be pre-plans-table legacy
-- rows) resolves to FREE, finishing what section 14b's backfill started.
UPDATE brands SET "planId" = (SELECT id FROM plans WHERE name = 'FREE') WHERE "planId" IS NULL;

-- --- 23e. Atomic publish: check + debit + activate, one transaction --------
-- Single plpgsql function = single implicit Postgres transaction, so a
-- failure at any point leaves both the gig and the brand's balances
-- completely unchanged (PRD: "credit remains unchanged, Gig remains Draft").
-- Row locks (FOR UPDATE) on both the gig and the brand serialize concurrent
-- publish attempts, so two racing requests for the same gig — or two
-- racing publishes from the same brand — can never both succeed.
-- DROP first: CREATE OR REPLACE cannot change an existing function's output
-- column names/types (only the body), and this signature's output columns
-- were renamed to fix the ambiguity noted above.
DROP FUNCTION IF EXISTS publish_gig_with_credit(UUID, UUID, INTEGER, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION publish_gig_with_credit(
  p_gig_id UUID,
  p_brand_id UUID,
  p_slots INTEGER,
  p_expires_at TIMESTAMPTZ
)
-- Output columns are prefixed (out_...) rather than named after the actual
-- brands columns — plpgsql implicitly declares a variable per RETURNS TABLE
-- column, and a same-named variable makes every unqualified reference to
-- that column inside this function's own UPDATE...SET statements ambiguous
-- ("column reference is ambiguous", SQLSTATE 42702). Applies to every
-- function below with a RETURNS TABLE clause.
RETURNS TABLE(
  out_campaign_credits_remaining INTEGER,
  out_application_slots_remaining INTEGER
) AS $$
DECLARE
  v_gig RECORD;
  v_brand RECORD;
  -- Explicit business decision (not the PRD's literal text, which is silent
  -- on this): 1 Campaign Credit pays for 1 Gig, not 1 ACTIVE transition. A
  -- reopen of a CLOSED/EXPIRED Gig that never had its credit refunded is
  -- free — the credit is still "spent" on this Gig. A reopen of a Gig whose
  -- credit *was* refunded (the 1-hour cancellation case) charges again,
  -- because the brand already got that credit back once — creditConsumed is
  -- the single flag both createGig's first publish and toggleGigStatus's
  -- reopen check, so there is exactly one rule, not two.
  v_needs_credit BOOLEAN;
BEGIN
  IF p_slots < 1 THEN
    RAISE EXCEPTION 'INVALID_SLOTS';
  END IF;

  SELECT * INTO v_gig FROM gigs WHERE id = p_gig_id AND "brandId" = p_brand_id FOR UPDATE;
  IF v_gig IS NULL THEN
    RAISE EXCEPTION 'GIG_NOT_FOUND';
  END IF;
  -- DRAFT: a first publish. CLOSED/EXPIRED: a reopen — PRD 20 says a reopen
  -- must re-check the *current* slot pool exactly like a fresh publish, not
  -- assume its old slots are still available, so this is the same atomic
  -- path for both rather than a second copy of that business rule. Whether
  -- it *also* spends a credit is decided by v_needs_credit above, not by
  -- which of these three statuses the Gig started in.
  IF v_gig.status NOT IN ('DRAFT', 'CLOSED', 'EXPIRED') THEN
    RAISE EXCEPTION 'GIG_NOT_PUBLISHABLE';
  END IF;

  v_needs_credit := NOT v_gig."creditConsumed";

  SELECT * INTO v_brand FROM brands WHERE id = p_brand_id FOR UPDATE;
  IF v_needs_credit AND v_brand."campaignCreditsRemaining" < 1 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CAMPAIGN_CREDITS';
  END IF;
  IF v_brand."applicationSlotsRemaining" < p_slots THEN
    RAISE EXCEPTION 'INSUFFICIENT_SLOTS';
  END IF;

  UPDATE brands SET
    "campaignCreditsRemaining" = "campaignCreditsRemaining" - (CASE WHEN v_needs_credit THEN 1 ELSE 0 END),
    "applicationSlotsRemaining" = "applicationSlotsRemaining" - p_slots
  WHERE id = p_brand_id;

  UPDATE gigs SET
    status = 'ACTIVE',
    "publishedAt" = now(),
    "expiresAt" = p_expires_at,
    "creditConsumed" = true,
    -- Reset on every (re)publish, freely reopened or not: this Gig is live
    -- again and eligible for its own fresh 1-hour cancellation window.
    "creditRefunded" = false,
    "applicationSlots" = p_slots,
    "applicationSlotsUsed" = 0,
    "slotsReleased" = false
  WHERE id = p_gig_id;

  IF v_needs_credit THEN
    INSERT INTO credit_transactions ("brandId", type, amount, "balanceBefore", "balanceAfter", "gigId", reason)
    VALUES (p_brand_id, 'PUBLISH', -1, v_brand."campaignCreditsRemaining", v_brand."campaignCreditsRemaining" - 1, p_gig_id,
            CASE WHEN v_gig.status = 'DRAFT' THEN 'Gig published' ELSE 'Gig reopened (credit re-charged: prior credit was refunded)' END);
  END IF;

  RETURN QUERY SELECT
    (v_brand."campaignCreditsRemaining" - (CASE WHEN v_needs_credit THEN 1 ELSE 0 END)),
    (v_brand."applicationSlotsRemaining" - p_slots);
END;
$$ LANGUAGE plpgsql;

-- ponytail: the two functions immediately below (close_gig_and_release,
-- expire_lapsed_gigs) return unrelated column names (unused_slots,
-- credit_refunded, expired_gig_id) that don't collide with any brands/gigs
-- column, so they're unaffected by the ambiguity issue noted above.

-- --- 23f. Atomic close/expire: idempotent slot release + 1-hour refund ----
-- Used by: manual close (brand-initiated, p_brand_id set → ownership
-- enforced by the WHERE), the expiry sweep (p_brand_id NULL → no ownership
-- filter, the scheduler is trusted), and hard delete (called first, then
-- the row is deleted). Server-side `now()` throughout — never a
-- client-supplied timestamp — for the 1-hour refund window.
CREATE OR REPLACE FUNCTION close_gig_and_release(
  p_gig_id UUID,
  p_brand_id UUID,
  p_new_status TEXT
)
RETURNS TABLE(
  unused_slots INTEGER,
  credit_refunded BOOLEAN
) AS $$
DECLARE
  v_gig RECORD;
  v_unused INTEGER;
  v_refund BOOLEAN := false;
BEGIN
  IF p_new_status NOT IN ('CLOSED', 'EXPIRED') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT * INTO v_gig FROM gigs WHERE id = p_gig_id
    AND (p_brand_id IS NULL OR "brandId" = p_brand_id) FOR UPDATE;
  IF v_gig IS NULL THEN
    RAISE EXCEPTION 'GIG_NOT_FOUND';
  END IF;

  -- Idempotent no-op: slots (and any 1hr refund) were already resolved for
  -- this gig by an earlier call. Still safe to re-run — nothing double-pays.
  IF v_gig."slotsReleased" THEN
    UPDATE gigs SET status = p_new_status WHERE id = p_gig_id AND status NOT IN ('CLOSED', 'EXPIRED');
    RETURN QUERY SELECT 0, false;
    RETURN;
  END IF;

  v_unused := GREATEST(0, COALESCE(v_gig."applicationSlots", 0) - COALESCE(v_gig."applicationSlotsUsed", 0));

  -- 1-hour cancellation refund: manual close only (never the scheduler's
  -- EXPIRED sweep — an expiry is never a "cancel"), only if a credit was
  -- actually spent and not already refunded, only within 1 hour of publish.
  IF p_new_status = 'CLOSED' AND v_gig."creditConsumed" AND NOT v_gig."creditRefunded"
     AND v_gig."publishedAt" IS NOT NULL
     AND now() - v_gig."publishedAt" <= INTERVAL '1 hour' THEN
    v_refund := true;
  END IF;

  UPDATE gigs SET
    status = p_new_status,
    "slotsReleased" = true,
    "creditConsumed" = CASE WHEN v_refund THEN false ELSE "creditConsumed" END,
    "creditRefunded" = CASE WHEN v_refund THEN true ELSE "creditRefunded" END
  WHERE id = p_gig_id;

  UPDATE brands SET
    "applicationSlotsRemaining" = "applicationSlotsRemaining" + v_unused,
    "campaignCreditsRemaining" = "campaignCreditsRemaining" + (CASE WHEN v_refund THEN 1 ELSE 0 END)
  WHERE id = v_gig."brandId";

  IF v_refund THEN
    INSERT INTO credit_transactions ("brandId", type, amount, "balanceBefore", "balanceAfter", "gigId", reason)
    SELECT v_gig."brandId", 'REFUND', 1, b."campaignCreditsRemaining" - 1, b."campaignCreditsRemaining", p_gig_id,
           'Cancelled within 1 hour of publish'
    FROM brands b WHERE b.id = v_gig."brandId";
  END IF;

  RETURN QUERY SELECT v_unused, v_refund;
END;
$$ LANGUAGE plpgsql;

-- --- 23g. Expiry sweep, rewritten to release slots per-gig -----------------
-- The old expireLapsedGigs() did one blind bulk UPDATE. That no longer works
-- once expiring a gig must also compute and release *that gig's* unused
-- slots to *that gig's brand* — a per-row operation. This function loops
-- lapsed gigs and reuses close_gig_and_release for each, in one DB call.
CREATE OR REPLACE FUNCTION expire_lapsed_gigs()
RETURNS TABLE(expired_gig_id UUID) AS $$
DECLARE
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT id FROM gigs WHERE status = 'ACTIVE' AND "expiresAt" <= now()
  LOOP
    PERFORM close_gig_and_release(v_row.id, NULL, 'EXPIRED');
    expired_gig_id := v_row.id;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- --- 23h. Application-slot consumption, rewritten against the new counter -
-- Same FOR UPDATE row-lock pattern as before, now checked against the
-- persisted applicationSlotsUsed counter (23b) instead of a live COUNT —
-- required so close_gig_and_release can compute "unused" without a second
-- query, and so this and the release path can never disagree.
DROP FUNCTION IF EXISTS insert_application_with_capacity(UUID, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION insert_application_with_capacity(
  p_gig_id        UUID,
  p_influencer_id UUID,
  p_cover_note    TEXT,
  p_reel_url      TEXT DEFAULT NULL
)
RETURNS SETOF applications AS $$
DECLARE
  v_allotted INTEGER;
  v_used     INTEGER;
BEGIN
  SELECT "applicationSlots", "applicationSlotsUsed" INTO v_allotted, v_used
  FROM gigs WHERE id = p_gig_id FOR UPDATE;

  IF v_allotted IS NULL THEN
    RETURN;
  END IF;

  IF v_used >= v_allotted THEN
    RETURN;
  END IF;

  UPDATE gigs SET "applicationSlotsUsed" = "applicationSlotsUsed" + 1 WHERE id = p_gig_id;

  RETURN QUERY
  INSERT INTO applications ("gigId", "influencerId", "coverNote", "reelUrl", status)
  VALUES (p_gig_id, p_influencer_id, p_cover_note, p_reel_url, 'PENDING')
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- --- 23i. Withdrawal frees the slot it held ---------------------------------
-- Mirrors the old live-COUNT behaviour (a withdrawn PENDING application
-- stopped counting automatically) now that usage is a persisted counter —
-- without this, a withdrawal would permanently strand a slot as "used".
CREATE OR REPLACE FUNCTION withdraw_application_and_release_slot(
  p_application_id UUID,
  p_influencer_id UUID
)
RETURNS SETOF applications AS $$
DECLARE
  v_app RECORD;
BEGIN
  SELECT * INTO v_app FROM applications
    WHERE id = p_application_id AND "influencerId" = p_influencer_id AND status = 'PENDING'
    FOR UPDATE;
  IF v_app IS NULL THEN
    RETURN;
  END IF;

  UPDATE gigs SET "applicationSlotsUsed" = GREATEST(0, "applicationSlotsUsed" - 1) WHERE id = v_app."gigId";

  RETURN QUERY DELETE FROM applications WHERE id = p_application_id AND status = 'PENDING' RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- --- 23j. Billing renewal: rollover, not reset ------------------------------
-- Adds the plan's per-cycle grant on top of whatever's left (PRD: 2 unused +
-- 5 new = 7, not 5). No automated payment collection anywhere here — V1 has
-- no billing provider; this only advances credits/slots/dates for brands
-- whose cycle has genuinely elapsed, same "sweep" pattern as gig expiry.
DROP FUNCTION IF EXISTS renew_brand_billing_cycle(UUID);
CREATE OR REPLACE FUNCTION renew_brand_billing_cycle(p_brand_id UUID)
RETURNS TABLE(
  out_campaign_credits_remaining INTEGER,
  out_application_slots_remaining INTEGER
) AS $$
DECLARE
  v_brand RECORD;
  v_plan RECORD;
BEGIN
  SELECT * INTO v_brand FROM brands WHERE id = p_brand_id FOR UPDATE;
  IF v_brand IS NULL THEN
    RAISE EXCEPTION 'BRAND_NOT_FOUND';
  END IF;

  SELECT * INTO v_plan FROM plans WHERE id = v_brand."planId";
  IF v_plan IS NULL THEN
    SELECT * INTO v_plan FROM plans WHERE name = 'FREE';
  END IF;

  UPDATE brands SET
    "campaignCreditsRemaining" = "campaignCreditsRemaining" + v_plan."campaignLimit",
    "applicationSlotsRemaining" = "applicationSlotsRemaining" + v_plan."applicationSlotLimit",
    "billingCycleStart" = COALESCE("billingCycleEnd", now()),
    "billingCycleEnd" = COALESCE("billingCycleEnd", now()) + INTERVAL '30 days'
  WHERE id = p_brand_id;

  INSERT INTO credit_transactions ("brandId", type, amount, "balanceBefore", "balanceAfter", reason)
  VALUES (p_brand_id, 'RENEWAL', v_plan."campaignLimit", v_brand."campaignCreditsRemaining",
          v_brand."campaignCreditsRemaining" + v_plan."campaignLimit", 'Monthly plan renewal');

  RETURN QUERY SELECT
    (v_brand."campaignCreditsRemaining" + v_plan."campaignLimit"),
    (v_brand."applicationSlotsRemaining" + v_plan."applicationSlotLimit");
END;
$$ LANGUAGE plpgsql;

-- --- 23k. Admin-only balance/plan adjustment (audited) ---------------------
-- The only path allowed to set arbitrary values on these fields — see
-- middleware/auth.js requireAdmin and admin.routes.js. Records an
-- ADMIN_ADJUSTMENT ledger row whenever campaign credits change.
CREATE OR REPLACE FUNCTION admin_adjust_brand_plan(
  p_brand_id UUID,
  p_plan_id UUID,
  p_campaign_credits INTEGER,
  p_application_slots INTEGER,
  p_billing_cycle_start TIMESTAMPTZ,
  p_billing_cycle_end TIMESTAMPTZ,
  p_reason TEXT
)
RETURNS brands AS $$
DECLARE
  v_before INTEGER;
  v_after brands;
BEGIN
  SELECT "campaignCreditsRemaining" INTO v_before FROM brands WHERE id = p_brand_id FOR UPDATE;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'BRAND_NOT_FOUND';
  END IF;

  UPDATE brands SET
    "planId" = COALESCE(p_plan_id, "planId"),
    "campaignCreditsRemaining" = COALESCE(p_campaign_credits, "campaignCreditsRemaining"),
    "applicationSlotsRemaining" = COALESCE(p_application_slots, "applicationSlotsRemaining"),
    "billingCycleStart" = COALESCE(p_billing_cycle_start, "billingCycleStart"),
    "billingCycleEnd" = COALESCE(p_billing_cycle_end, "billingCycleEnd")
  WHERE id = p_brand_id
  RETURNING * INTO v_after;

  IF p_campaign_credits IS NOT NULL AND p_campaign_credits != v_before THEN
    INSERT INTO credit_transactions ("brandId", type, amount, "balanceBefore", "balanceAfter", reason)
    VALUES (p_brand_id, 'ADMIN_ADJUSTMENT', p_campaign_credits - v_before, v_before, p_campaign_credits,
            COALESCE(p_reason, 'Admin adjustment'));
  END IF;

  RETURN v_after;
END;
$$ LANGUAGE plpgsql;

-- --- 23l. Production data backfill ------------------------------------------
-- Decided policy (explicit business approval obtained before running this):
--   - Every existing brand's new campaignCreditsRemaining is reset to its
--     plan's fresh per-cycle allotment. The OLD `credits` balance is a
--     different currency (it could be spent on hiring, which costs nothing
--     now) and is NOT converted — it is left in place, untouched, as
--     historical/deprecated data only.
--   - applicationSlotsRemaining is set to the plan's fresh allotment MINUS
--     slots already held by that brand's currently-ACTIVE gigs (their
--     applicationSlots/allotment), so the pool stays internally consistent:
--     an active gig's held slots must stay reserved out of the pool, or the
--     brand would end up with more total slots in circulation than its plan
--     allows the moment that gig later closes and "returns" them.
--   - Every brand gets a fresh 30-day billing cycle starting now.
--   - Existing gigs are NOT retroactively charged a Campaign Credit — only
--     backfilled with the new bookkeeping fields so future close/expire
--     events on them behave correctly:
--       * ACTIVE   -> creditConsumed = true (already "paid" under the old
--                     model), applicationSlotsUsed = real received-
--                     application count, slotsReleased = false (still live).
--       * CLOSED/EXPIRED -> creditConsumed = true, applicationSlotsUsed =
--                     real received count, slotsReleased = true (already
--                     resolved — no historical "unused slot" credit is
--                     granted into the fresh pool; see applicationSlots-
--                     Remaining note above, this is a clean-slate reset).
--       * DRAFT (none existed in production at the time this migration was
--                     written) -> creditConsumed = false, unaffected.
-- This block only ever touches rows that still have billingCycleStart IS
-- NULL, so it is safe to re-run (idempotent) — a brand that has already
-- been through this backfill, or onboarded after it, is left alone.

UPDATE gigs SET
  "applicationSlotsUsed" = LEAST("applicationSlots", COALESCE((
    SELECT COUNT(*) FROM applications a WHERE a."gigId" = gigs.id
  ), 0)),
  "creditConsumed" = true,
  "slotsReleased" = (status IN ('CLOSED', 'EXPIRED'))
WHERE status IN ('ACTIVE', 'CLOSED', 'EXPIRED') AND "publishedAt" IS NOT NULL;

-- Postgres does not allow the UPDATE target's own alias inside a JOIN...ON
-- within its FROM clause, so the join happens entirely inside this CTE
-- first; the outer UPDATE...FROM then matches on a single derived table.
WITH plan_alloc AS (
  SELECT
    b.id AS brand_id,
    p."campaignLimit",
    p."applicationSlotLimit",
    COALESCE(a.held, 0) AS held
  FROM brands b
  JOIN plans p ON p.id = b."planId"
  LEFT JOIN (
    SELECT "brandId", COALESCE(SUM("applicationSlots"), 0) AS held
    FROM gigs WHERE status = 'ACTIVE'
    GROUP BY "brandId"
  ) a ON a."brandId" = b.id
  WHERE b."billingCycleStart" IS NULL
)
UPDATE brands b SET
  "campaignCreditsRemaining" = pa."campaignLimit",
  "applicationSlotsRemaining" = GREATEST(0, pa."applicationSlotLimit" - pa.held),
  "billingCycleStart" = now(),
  "billingCycleEnd" = now() + INTERVAL '30 days'
FROM plan_alloc pa
WHERE b.id = pa.brand_id;

-- --- 23m. Reallocate slots on an already-published gig ---------------------
-- Pre-existing feature (allocateSlots), rewired against the new pool: raising
-- a live campaign's allotment spends more from the brand's pool, lowering it
-- refunds the difference back — both atomically, in the same statement as
-- the gig's own allotment change, so the pool and the gig can never drift
-- out of sync with each other.
DROP FUNCTION IF EXISTS reallocate_gig_slots(UUID, UUID, INTEGER);
CREATE OR REPLACE FUNCTION reallocate_gig_slots(
  p_gig_id UUID,
  p_brand_id UUID,
  p_new_slots INTEGER
)
RETURNS TABLE(out_application_slots_remaining INTEGER) AS $$
DECLARE
  v_gig RECORD;
  v_brand RECORD;
  v_delta INTEGER;
BEGIN
  IF p_new_slots < 1 THEN
    RAISE EXCEPTION 'INVALID_SLOTS';
  END IF;

  SELECT * INTO v_gig FROM gigs WHERE id = p_gig_id AND "brandId" = p_brand_id FOR UPDATE;
  IF v_gig IS NULL THEN
    RAISE EXCEPTION 'GIG_NOT_FOUND';
  END IF;
  IF p_new_slots < v_gig."applicationSlotsUsed" THEN
    RAISE EXCEPTION 'SLOTS_BELOW_RECEIVED';
  END IF;

  v_delta := p_new_slots - COALESCE(v_gig."applicationSlots", 0);
  IF v_delta = 0 THEN
    RETURN QUERY SELECT "applicationSlotsRemaining" FROM brands WHERE id = p_brand_id;
    RETURN;
  END IF;

  SELECT * INTO v_brand FROM brands WHERE id = p_brand_id FOR UPDATE;
  IF v_delta > 0 AND v_brand."applicationSlotsRemaining" < v_delta THEN
    RAISE EXCEPTION 'INSUFFICIENT_SLOTS';
  END IF;

  UPDATE brands SET "applicationSlotsRemaining" = "applicationSlotsRemaining" - v_delta WHERE id = p_brand_id;
  UPDATE gigs SET "applicationSlots" = p_new_slots WHERE id = p_gig_id;

  RETURN QUERY SELECT (v_brand."applicationSlotsRemaining" - v_delta);
END;
$$ LANGUAGE plpgsql;
