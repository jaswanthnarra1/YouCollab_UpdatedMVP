/**
 * YouCollab — Plan Routes
 * =======================
 * GET   /api/plans        → plan catalogue (public — same pricing page any
 *                            signed-out visitor sees)
 * GET   /api/plans/usage  → current brand's Campaign Credits / Application
 *                            Slots / billing cycle + per-campaign breakdown
 *
 * V1 has no self-service plan change — see admin.routes.js
 * PATCH /api/admin/brands/:brandId/plan for the only path that can change a
 * brand's plan, credits, slots, or billing dates.
 */

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const planController = require('../controllers/plan.controller');

const router = express.Router();

router.get('/', planController.list);
router.get('/usage', authenticate, requireRole('BRAND'), planController.usage);

module.exports = router;
