-- ============================================
-- YouCollab Database Schema for Supabase
-- Run this ENTIRE script in the Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Tables
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('BRAND', 'INFLUENCER')),
  "avatarUrl" TEXT,
  "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
  "lastActiveAt" TIMESTAMPTZ DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "businessName" TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Pune',
  bio TEXT NOT NULL,
  "logoUrl" TEXT,
  website TEXT
);

CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "instagramHandle" TEXT NOT NULL,
  niche TEXT NOT NULL,
  bio TEXT NOT NULL,
  "profileImageUrl" TEXT,
  "followerCount" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "brandId" UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  "budgetMin" INTEGER NOT NULL,
  "budgetMax" INTEGER,
  deliverables TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  city TEXT NOT NULL DEFAULT 'Pune',
  category TEXT NOT NULL,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "gigId" UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  "influencerId" UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  "coverNote" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("gigId", "influencerId")
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_gigs_city ON gigs(city);
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs(category);
CREATE INDEX IF NOT EXISTS idx_gigs_created_at ON gigs("createdAt");
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens("userId");
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens("tokenHash");
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications("userId", "isRead");
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications("userId", "createdAt");

-- ============================================
-- 3. Auto-update "updatedAt" trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gigs_updated_at ON gigs;
CREATE TRIGGER update_gigs_updated_at
  BEFORE UPDATE ON gigs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. RPC: Increment gig view count atomically
-- ============================================

CREATE OR REPLACE FUNCTION increment_view_count(gig_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE gigs SET "viewCount" = "viewCount" + 1 WHERE id = gig_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Row Level Security (permissive for backend)
-- Our Express backend manages its own auth via JWT.
-- These policies allow full access for the anon key.
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_brands" ON brands FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_influencers" ON influencers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_gigs" ON gigs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_applications" ON applications FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_refresh_tokens" ON refresh_tokens FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_notifications" ON notifications FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_brands" ON brands FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_influencers" ON influencers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_gigs" ON gigs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_applications" ON applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_refresh_tokens" ON refresh_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_notifications" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 6. Grant permissions
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
