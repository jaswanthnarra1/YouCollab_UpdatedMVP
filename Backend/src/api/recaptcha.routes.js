const express = require('express');
const recaptchaController = require('../controllers/recaptcha.controller');
const validate = require('../middleware/validate');
const { verifyCaptchaSchema } = require('../models/recaptcha.schema');
const { verifyCaptcha } = require('../middleware/recaptcha');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/verify', authLimiter, validate(verifyCaptchaSchema), verifyCaptcha, recaptchaController.verify);

module.exports = router;
