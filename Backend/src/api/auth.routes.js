const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, verifyOtpSchema, resendOtpSchema, resetPasswordSchema, changePasswordSchema, updateEmailSchema, updatePreferencesSchema } = require('../models/auth.schema');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/resend-otp', authLimiter, validate(resendOtpSchema), authController.resendOtp);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.get('/me', authenticate, authController.me);
router.patch('/password', authenticate, authLimiter, validate(changePasswordSchema), authController.changePassword);
router.patch('/email', authenticate, authLimiter, validate(updateEmailSchema), authController.updateEmail);
router.delete('/account', authenticate, authController.deleteAccount);
router.patch('/preferences', authenticate, validate(updatePreferencesSchema), authController.updatePreferences);

module.exports = router;
