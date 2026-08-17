const { z } = require('zod');

/**
 * All fields optional — an admin can adjust just one thing (e.g. only
 * credits) without having to resend the rest. Every field here maps
 * directly to a brands column the PRD names as admin-managed (section 28);
 * nothing else is settable through this endpoint.
 */
const adminUpdateBrandPlanSchema = z.object({
  planName: z.enum(['FREE', 'STARTER', 'GROWTH']).optional(),
  campaignCredits: z.number().int().min(0).optional(),
  applicationSlots: z.number().int().min(0).optional(),
  billingCycleStart: z.string().datetime().optional(),
  billingCycleEnd: z.string().datetime().optional(),
  reason: z.string().max(500).optional(),
});

module.exports = { adminUpdateBrandPlanSchema };
