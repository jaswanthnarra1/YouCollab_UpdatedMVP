const express = require('express');
const discoveryController = require('../controllers/discovery.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/nearby', authenticate, discoveryController.nearby);

module.exports = router;
