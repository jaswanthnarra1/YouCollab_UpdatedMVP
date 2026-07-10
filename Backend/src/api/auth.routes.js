const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updatePreferencesSchema } = require('../models/auth.schema');

const router = express.Router();

router.get('/me', authenticate, authController.me);
router.delete('/account', authenticate, authController.deleteAccount);
router.patch('/preferences', authenticate, validate(updatePreferencesSchema), authController.updatePreferences);

module.exports = router;
