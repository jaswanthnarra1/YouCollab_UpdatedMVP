const express = require('express');
const gigController = require('../controllers/gig.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createGigSchema, updateGigSchema } = require('../validators/gig.schema');

const router = express.Router();

router.post('/', authenticate, requireRole('BRAND'), validate(createGigSchema), gigController.create);
router.get('/', authenticate, gigController.list);
router.get('/mine', authenticate, requireRole('BRAND'), gigController.mine);
router.get('/:id', authenticate, gigController.detail);
router.patch('/:id', authenticate, requireRole('BRAND'), validate(updateGigSchema), gigController.update);
router.delete('/:id', authenticate, requireRole('BRAND'), gigController.close);

module.exports = router;
