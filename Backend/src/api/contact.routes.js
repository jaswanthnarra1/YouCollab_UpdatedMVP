const express = require('express');
const contactController = require('../controllers/contact.controller');
const validate = require('../middleware/validate');
const { contactSchema } = require('../models/contact.schema');
const { contactLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/', contactLimiter, validate(contactSchema), contactController.submit);

module.exports = router;
