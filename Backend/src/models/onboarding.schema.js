const { z } = require('zod');

const pincodeSchema = z.string({ required_error: 'PIN code is required' })
  .regex(/^\d{6}$/, 'PIN code must be 6 digits');

const brandOnboardingSchema = z.object({
  businessName: z.string({ required_error: 'Business name is required' })
    .min(2, 'Business name must be at least 2 characters long')
    .max(100, 'Business name is too long'),
  category: z.string({ required_error: 'Category is required' })
    .min(2, 'Category must be at least 2 characters long'),
  location: z.string().default('Pune'),
  pincode: pincodeSchema,
  bio: z.string({ required_error: 'A short bio helps creators know your vibe' })
    .max(1000)
    .refine((val) => val.trim().split(/\s+/).filter(Boolean).length >= 3, {
      message: 'Bio must contain at least three words',
    }),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
  website: z.string().url('Please enter a valid website URL starting with http/https').optional().or(z.literal('')),
});

/**
 * NOTE: `instagramHandle` and `followerCount` are deliberately absent here and
 * in updateInfluencerProfileSchema. They are owned exclusively by the Instagram
 * integration (see services/instagram.service.js), which writes them from the
 * Meta Graph API after a verified OAuth connection.
 *
 * This is a correctness boundary: brand-facing creator cards and search/
 * filtering depend on `followerCount` being real, verified Meta data — a
 * self-reported value would be trivially inflatable. (It no longer gates a
 * credit cost — hiring is free for every follower range under the V1
 * business model, see application.service.js.)
 *
 * Zod strips unknown keys by default, so a client sending these fields has them
 * silently discarded rather than the request failing — the desired behaviour
 * for a field the client should simply have no say over.
 */
const influencerOnboardingSchema = z.object({
  name: z.string({ required_error: 'Your name is required' })
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name is too long'),
  niche: z.string({ required_error: 'Niche is required' })
    .min(2, 'Niche is required'),
  pincode: pincodeSchema,
  bio: z.string({ required_error: 'A short bio helps brands know your style' })
    .max(1000)
    .refine((val) => val.trim().split(/\s+/).filter(Boolean).length >= 3, {
      message: 'Bio must contain at least three words',
    }),
  profileImageUrl: z.string().url('Invalid profile image URL').optional().or(z.literal('')),
});

module.exports = {
  brandOnboardingSchema,
  influencerOnboardingSchema,
};
