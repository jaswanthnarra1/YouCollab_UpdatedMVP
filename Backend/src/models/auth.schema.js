const { z } = require('zod');

const updatePreferencesSchema = z.object({
  notificationPrefs: z.record(z.boolean()).optional(),
  privacyPrefs: z.record(z.boolean()).optional(),
});

module.exports = {
  updatePreferencesSchema,
};
