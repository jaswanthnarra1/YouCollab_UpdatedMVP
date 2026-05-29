const { z } = require('zod');

const applySchema = z.object({
  gigId: z.string({ required_error: 'Gig ID is required' }).uuid('Invalid Gig ID'),
  coverNote: z.string({ required_error: 'Write a pitch to get the brand interested! ✨' })
    .min(10, 'Introduce yourself slightly more (at least 10 characters)')
    .max(1000, 'Pitch is too long'),
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be PENDING, ACCEPTED, or REJECTED',
  }),
});

module.exports = {
  applySchema,
  updateApplicationStatusSchema,
};
