const { z } = require('zod');

const registerSchema = z.object({
  name: z.string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters long'),
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

const verifyOtpSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .email('Please enter a valid email address'),
  otp: z.string({ required_error: 'OTP is required' })
    .length(6, 'OTP must be exactly 6 digits'),
});

const resendOtpSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .email('Please enter a valid email address'),
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
};
