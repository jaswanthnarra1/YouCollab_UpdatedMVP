const { z } = require('zod');
const { INSTAGRAM_URL_REGEX } = require('../utils/instagramUrl');

const submitReferralSchema = z.object({
  reelUrl: z.string({ required_error: 'Add a Reel link to submit' })
    .trim()
    .regex(INSTAGRAM_URL_REGEX, 'Enter a valid Instagram Reel link'),
  instagramUsername: z.string().trim().max(100).optional(),
});

const setVerifiedViewsSchema = z.object({
  verifiedViews: z.coerce.number({ required_error: 'Verified views is required' })
    .int('Verified views must be a whole number')
    .nonnegative('Verified views cannot be negative'),
});

module.exports = { submitReferralSchema, setVerifiedViewsSchema };
