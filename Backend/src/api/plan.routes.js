/**
 * YouCollab — Plan Routes
 * =======================
 * GET   /api/plans          → plan catalogue (public — same pricing page any
 *                              signed-out visitor sees)
 * GET   /api/plans/usage    → current brand's Campaign Credits / Application
 *                              Slots / billing cycle + latest plan-change request
 * POST  /api/plans/request  → Brand requests a plan change (creates a
 *                              PENDING request row only — never applies it)
 *
 * V1 has no self-service plan change — see admin.routes.js
 * PATCH /api/admin/brands/:brandId/plan (direct adjustment) and
 * PATCH /api/admin/plan-requests/:id/approve|reject (request queue) for the
 * only paths that can actually change a brand's plan, credits, slots, or
 * billing dates.
 */

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const planController = require('../controllers/plan.controller');
const { requestPlanChangeSchema } = require('../models/plan.schema');

const router = express.Router();

router.get('/', planController.list);
router.get('/usage', authenticate, requireRole('BRAND'), planController.usage);
router.post('/request', authenticate, requireRole('BRAND'), validate(requestPlanChangeSchema), planController.requestChange);

module.exports = router;
