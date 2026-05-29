const { z } = require('zod');

const registerSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .email('Please enter a valid email address'),
  password: z.string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['BRAND', 'INFLUENCER'], {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be either BRAND or INFLUENCER',
  }),
});

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .email('Please enter a valid email address'),
  password: z.string({ required_error: 'Password is required' }),
});

module.exports = {
  registerSchema,
  loginSchema,
};
