const { z } = require('zod');

/** Brand-facing: request a switch to a specific catalogue plan. */
const requestPlanChangeSchema = z.object({
  planName: z.enum(['FREE', 'STARTER', 'GROWTH'], { required_error: 'planName is required' }),
});

module.exports = { requestPlanChangeSchema };
