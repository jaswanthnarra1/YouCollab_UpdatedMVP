/**
 * End-to-end check for the Brand -> Admin plan-change request queue
 * (schema.sql section 24, plan.service.js requestPlanChange /
 * adminApprovePlanChangeRequest / adminRejectPlanChangeRequest).
 * Talks to the real database, creates its own scratch rows, cleans up.
 * Run: node Backend/scripts/verify-plan-requests.js
 */
require('../src/config');
const { supabaseAdmin } = require('../src/services/supabase');
const planService = require('../src/services/plan.service');

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const expectThrow = async (name, fn, code) => {
  try { await fn(); check(name, false, '(no error thrown)'); }
  catch (e) { check(name, e.code === code, `(got ${e.code}: ${e.message})`); }
};

(async () => {
  const stamp = Date.now();
  const ids = { users: [], brands: [] };

  try {
    console.log('\n--- setup ---');
    const free = await planService.getPlanByName('FREE');
    const starter = await planService.getPlanByName('STARTER');
    const growth = await planService.getPlanByName('GROWTH');

    const { data: userRow } = await supabaseAdmin.from('users')
      .insert({ email: `v-planreq-${stamp}@verify.local`, role: 'BRAND', full_name: 'verify-planreq', is_onboarded: true })
      .select('id').single();
    ids.users.push(userRow.id);

    const { data: brand } = await supabaseAdmin.from('brands').insert({
      userId: userRow.id, businessName: 'Verify Plan Req Co', category: 'Cafe', location: 'Pune', bio: 'verify',
      planId: free.id, campaignCreditsRemaining: 2, applicationSlotsRemaining: 10,
      billingCycleStart: new Date().toISOString(), billingCycleEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    }).select('id').single();
    ids.brands.push(brand.id);
    console.log('  FREE-plan brand created');

    console.log('\n--- request creation ---');
    await expectThrow(
      'requesting the current plan is rejected',
      () => planService.requestPlanChange(brand.id, 'FREE'),
      'BAD_REQUEST',
    );

    const req1 = await planService.requestPlanChange(brand.id, 'GROWTH');
    check('request created with PENDING status', req1.status === 'PENDING', req1.status);
    check('request records the current plan (FREE)', req1.currentPlanId === free.id);
    check('request records the requested plan (GROWTH)', req1.requestedPlanId === growth.id);

    console.log('\n--- duplicate prevention ---');
    await expectThrow(
      'a second request while one is pending is rejected',
      () => planService.requestPlanChange(brand.id, 'STARTER'),
      'CONFLICT',
    );
    // Also hit the DB-level guard directly, bypassing the JS pre-check, to
    // prove the partial unique index is the real backstop, not just the
    // friendlier JS check above.
    const { error: rawInsertErr } = await supabaseAdmin
      .from('plan_change_requests')
      .insert({ brandId: brand.id, currentPlanId: free.id, requestedPlanId: starter.id });
    check('DB unique index blocks a second PENDING row directly', rawInsertErr?.code === '23505', JSON.stringify(rawInsertErr));

    console.log('\n--- usage summary reflects the pending request ---');
    const usage1 = await planService.getBrandUsageSummary(brand.id);
    check('getBrandUsageSummary surfaces the pending request', usage1.latestRequest?.id === req1.id);
    check('surfaced request is still PENDING', usage1.latestRequest?.status === 'PENDING');

    console.log('\n--- admin approval ---');
    const approved = await planService.adminApprovePlanChangeRequest(req1.id, 'verify-admin-clerk-id');
    check('approve returns APPROVED status', approved.status === 'APPROVED', approved.status);

    const { data: brandAfterApproval } = await supabaseAdmin.from('brands').select('planId, "campaignCreditsRemaining", "applicationSlotsRemaining"').eq('id', brand.id).single();
    check('brand planId switched to the requested plan (GROWTH)', brandAfterApproval.planId === growth.id);
    check('approval does NOT auto-grant new credits (existing V1 rule: only renewal grants)', brandAfterApproval.campaignCreditsRemaining === 2, `got ${brandAfterApproval.campaignCreditsRemaining}`);
    check('approval does NOT auto-grant new slots either', brandAfterApproval.applicationSlotsRemaining === 10, `got ${brandAfterApproval.applicationSlotsRemaining}`);

    await expectThrow(
      'cannot approve the same request twice',
      () => planService.adminApprovePlanChangeRequest(req1.id, 'verify-admin-clerk-id'),
      'BAD_REQUEST',
    );

    console.log('\n--- new request now allowed (previous one resolved) ---');
    const req2 = await planService.requestPlanChange(brand.id, 'STARTER');
    check('brand can submit a new request once the prior one is resolved', req2.status === 'PENDING');

    console.log('\n--- admin rejection ---');
    const rejected = await planService.adminRejectPlanChangeRequest(req2.id, 'verify-admin-clerk-id');
    check('reject returns REJECTED status', rejected.status === 'REJECTED', rejected.status);

    const { data: brandAfterRejection } = await supabaseAdmin.from('brands').select('planId').eq('id', brand.id).single();
    check('rejection does NOT change the brand plan', brandAfterRejection.planId === growth.id, `still GROWTH from the earlier approval, got ${brandAfterRejection.planId}`);

    await expectThrow(
      'cannot reject an already-reviewed request',
      () => planService.adminRejectPlanChangeRequest(req2.id, 'verify-admin-clerk-id'),
      'BAD_REQUEST',
    );

    console.log('\n--- admin listing ---');
    const allRequests = await planService.adminListPlanChangeRequests();
    const ours = allRequests.filter((r) => r.brandId === brand.id);
    check('admin list includes both requests for this brand', ours.length === 2, `found ${ours.length}`);
    check('admin list includes the brand name (joined)', ours.every((r) => r.brand?.businessName === 'Verify Plan Req Co'));

    const pendingOnly = await planService.adminListPlanChangeRequests({ status: 'PENDING' });
    check('status filter excludes resolved requests for this brand', !pendingOnly.some((r) => r.brandId === brand.id));

  } catch (err) {
    fail++; console.error('\nUNEXPECTED ERROR:', err.message, err.stack?.split('\n')[1]);
  } finally {
    console.log('\n--- cleanup ---');
    for (const id of ids.brands) await supabaseAdmin.from('plan_change_requests').delete().eq('brandId', id);
    for (const id of ids.brands) await supabaseAdmin.from('brands').delete().eq('id', id);
    for (const id of ids.users) await supabaseAdmin.from('users').delete().eq('id', id);
    console.log('  scratch rows removed');
    console.log(`\n=== ${pass} passed, ${fail} failed ===`);
    process.exit(fail ? 1 : 0);
  }
})();
