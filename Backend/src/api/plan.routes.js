/**
 * YouCollab — Plan & Subscription Routes
 * ======================================
 * GET   /api/plans        → plan catalogue (any authenticated user)
 * GET   /api/plans/usage  → current brand's plan + live usage
 * PATCH /api/plans/assign → switch the current brand's plan
 */

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const planController = require('../controllers/plan.controller');

const router = express.Router();

router.get('/', authenticate, planController.list);
router.get('/usage', authenticate, requireRole('BRAND'), planController.usage);
router.patch('/assign', authenticate, requireRole('BRAND'), planController.assign);

module.exports = router;
