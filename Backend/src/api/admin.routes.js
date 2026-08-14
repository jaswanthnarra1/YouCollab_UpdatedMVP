const express = require('express');
const referralController = require('../controllers/referral.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { setVerifiedViewsSchema } = require('../models/referral.schema');

const router = express.Router();

// Every route below requires a signed-in, env-allowlisted admin — see
// config.ADMIN.CLERK_USER_IDS and middleware/auth.js requireAdmin.
router.use(authenticate, requireAdmin);

router.get('/referrals', referralController.adminList);
router.patch('/referrals/:id/review', referralController.adminMarkUnderReview);
router.patch('/referrals/:id/verified-views', validate(setVerifiedViewsSchema), referralController.adminSetVerifiedViews);
router.post('/referrals/:id/winner', referralController.adminMarkWinner);

module.exports = router;
