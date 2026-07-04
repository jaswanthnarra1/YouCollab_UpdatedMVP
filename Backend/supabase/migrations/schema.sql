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

-- Creators earn credits from the same hire transaction that debits the
-- brand's balance — starts at 0, there's no trial pack on this side.
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;

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
