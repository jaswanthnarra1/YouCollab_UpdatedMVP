const { z } = require('zod');

const createGigSchema = z.object({
  title: z.string({ required_error: 'Give your collab a catchy title 🚀' })
    .min(5, 'Title must be at least 5 characters long')
    .max(100, 'Title is too long'),
  description: z.string({ required_error: 'Describe the collab in detail' })
    .min(20, 'Describe the collab a bit more (at least 20 characters)')
    .max(2000, 'Description is too long'),
  budgetMin: z.number({ required_error: 'Set a minimum budget' })
    .int('Budget must be an integer')
    .min(100, 'Minimum budget should be at least ₹100'),
  budgetMax: z.number().int('Budget must be an integer').min(100).optional().nullable(),
  deliverables: z.string({ required_error: 'List the deliverables expected' })
    .min(5, 'Please outline the deliverables'),
  deadline: z.string({ required_error: 'Set a deadline for applications' })
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })
    .transform((val) => new Date(val))
    .refine((date) => date > new Date(), { message: 'Applications deadline must be in the future' }),
  category: z.string({ required_error: 'Select a category' })
    .min(2, 'Category is required'),
}).refine((data) => {
  if (data.budgetMax && data.budgetMax < data.budgetMin) {
    return false;
  }
  return true;
}, {
  message: 'Max budget cannot be lower than min budget',
  path: ['budgetMax'],
});

const updateGigSchema = z.object({
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(20).max(2000).optional(),
  budgetMin: z.number().int().min(100).optional(),
  budgetMax: z.number().int().min(100).optional().nullable(),
  deliverables: z.string().min(5).optional(),
  deadline: z.string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })
    .transform((val) => new Date(val))
    .refine((date) => date > new Date(), { message: 'Applications deadline must be in the future' })
    .optional(),
  category: z.string().min(2).optional(),
  status: z.enum(['OPEN', 'CLOSED', 'DRAFT']).optional(),
}).refine((data) => {
  if (data.budgetMin && data.budgetMax && data.budgetMax < data.budgetMin) {
    return false;
  }
  return true;
}, {
  message: 'Max budget cannot be lower than min budget',
  path: ['budgetMax'],
});

module.exports = {
  createGigSchema,
  updateGigSchema,
};
