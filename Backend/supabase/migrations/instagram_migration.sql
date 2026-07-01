-- ============================================================
-- YouCollab — Instagram Graph API Integration Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

ALTER TABLE influencers
  -- Core identity
  ADD COLUMN IF NOT EXISTS "igUserId"         TEXT,
  ADD COLUMN IF NOT EXISTS "igUsername"       TEXT,

  -- Auth tokens
  ADD COLUMN IF NOT EXISTS "igAccessToken"    TEXT,
  ADD COLUMN IF NOT EXISTS "igTokenExpiresAt" TIMESTAMPTZ,

  -- Connection meta
  ADD COLUMN IF NOT EXISTS "igConnectedAt"    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "isIgVerified"     BOOLEAN NOT NULL DEFAULT FALSE,

  -- Profile metrics (synced from API)
  ADD COLUMN IF NOT EXISTS "igFollowersCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "igFollowingCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "igMediaCount"     INTEGER,
  ADD COLUMN IF NOT EXISTS "igProfilePicUrl"  TEXT,
  ADD COLUMN IF NOT EXISTS "igBio"            TEXT,

  -- Sync tracking
  ADD COLUMN IF NOT EXISTS "igLastSyncAt"     TIMESTAMPTZ;

-- Optional: index for fast lookups by igUserId
CREATE UNIQUE INDEX IF NOT EXISTS influencers_ig_user_id_idx
  ON influencers ("igUserId")
  WHERE "igUserId" IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN influencers."igUserId"         IS 'Numeric Instagram User ID from Graph API';
COMMENT ON COLUMN influencers."igUsername"       IS 'Instagram handle (without @) from Graph API';
COMMENT ON COLUMN influencers."igAccessToken"    IS 'Long-lived access token (60-day validity)';
COMMENT ON COLUMN influencers."igTokenExpiresAt" IS 'Expiry timestamp for proactive refresh scheduling';
COMMENT ON COLUMN influencers."igConnectedAt"    IS 'Timestamp when influencer first connected their Instagram';
COMMENT ON COLUMN influencers."isIgVerified"     IS 'TRUE when a valid Instagram OAuth connection exists';
COMMENT ON COLUMN influencers."igFollowersCount" IS 'Followers count synced from Instagram Graph API';
COMMENT ON COLUMN influencers."igFollowingCount" IS 'Following count synced from Instagram Graph API';
COMMENT ON COLUMN influencers."igMediaCount"     IS 'Total media/posts count from Instagram Graph API';
COMMENT ON COLUMN influencers."igProfilePicUrl"  IS 'Profile picture URL returned by Graph API';
COMMENT ON COLUMN influencers."igBio"            IS 'Instagram biography/bio from Graph API';
COMMENT ON COLUMN influencers."igLastSyncAt"     IS 'Timestamp of last successful API data sync';
