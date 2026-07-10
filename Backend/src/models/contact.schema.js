const { z } = require('zod');

const contactSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string({ required_error: 'Email is required' }).email('Please enter a valid email address'),
  message: z.string({ required_error: 'Message is required' }).min(10, 'Message must be at least 10 characters long').max(5000),
  captchaToken: z.string({ required_error: 'Captcha token is required' }).min(1, 'Captcha token is required'),
});

module.exports = { contactSchema };
