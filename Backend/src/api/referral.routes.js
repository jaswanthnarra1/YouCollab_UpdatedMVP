const express = require('express');
const referralController = require('../controllers/referral.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { submitReferralSchema } = require('../models/referral.schema');

const router = express.Router();

router.post('/', authenticate, requireRole('INFLUENCER'), validate(submitReferralSchema), referralController.submit);
router.get('/me', authenticate, requireRole('INFLUENCER'), referralController.listMine);

module.exports = router;
