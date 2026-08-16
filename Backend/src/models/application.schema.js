const { z } = require('zod');
const { INSTAGRAM_URL_REGEX } = require('../utils/instagramUrl');

const applySchema = z.object({
  gigId: z.string({ required_error: 'Gig ID is required' }).uuid('Invalid Gig ID'),
  coverNote: z.string({ required_error: 'Write a pitch to get the brand interested! ✨' })
    .min(10, 'Introduce yourself slightly more (at least 10 characters)')
    .max(1000, 'Pitch is too long'),
  // Optional at apply time — creators can add it later. Still validated
  // against the real format when they do provide one, and an empty string
  // (the frontend's "nothing typed" state) is treated the same as omitting
  // it entirely, so the DB gets NULL either way.
  reelUrl: z.string().trim().regex(INSTAGRAM_URL_REGEX, 'Enter a valid Instagram Reel link')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be PENDING, ACCEPTED, or REJECTED',
  }),
});

const sendMessageSchema = z.object({
  content: z.string({ required_error: 'Message cannot be empty' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message is too long'),
});

module.exports = {
  applySchema,
  updateApplicationStatusSchema,
  sendMessageSchema,
};
