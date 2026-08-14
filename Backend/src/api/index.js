const express = require('express');
const authRoutes = require('./auth.routes');
const onboardingRoutes = require('./onboarding.routes');
const gigRoutes = require('./gig.routes');
const applicationRoutes = require('./application.routes');
const notificationRoutes = require('./notification.routes');
const uploadRoutes = require('./upload.routes');
const instagramRoutes = require('./instagram.routes');
const profileRoutes = require('./profile.routes');
const contactRoutes = require('./contact.routes');
const planRoutes = require('./plan.routes');
const referralRoutes = require('./referral.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/gigs', gigRoutes);
router.use('/applications', applicationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/upload', uploadRoutes);
router.use('/instagram', instagramRoutes);
router.use('/profile', profileRoutes);
router.use('/contact', contactRoutes);
router.use('/plans', planRoutes);
router.use('/referrals', referralRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'YouCollab API is running smoothly Pune style! 🚀' });
});

module.exports = router;
