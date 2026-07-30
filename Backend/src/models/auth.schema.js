const { z } = require('zod');

const updatePreferencesSchema = z.object({
  notificationPrefs: z.record(z.boolean()).optional(),
  privacyPrefs: z.record(z.boolean()).optional(),
});

const acceptTermsSchema = z.object({
  accepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service and Privacy Policy to continue.' }),
  }),
  version: z.string().min(1),
});

module.exports = {
  updatePreferencesSchema,
  acceptTermsSchema,
};
