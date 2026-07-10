const { z } = require('zod');

const verifyCaptchaSchema = z.object({
  captchaToken: z.string({ required_error: 'Captcha token is required' }).min(1, 'Captcha token is required'),
});

module.exports = { verifyCaptchaSchema };
