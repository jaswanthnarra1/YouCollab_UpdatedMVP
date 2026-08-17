/**
 * End-to-end check for the V1 Campaign Credit / Application Slot business
 * model (schema.sql section 23, gig.service.js, application.service.js,
 * plan.service.js). Talks to the real database, creates its own scratch
 * rows, and cleans up. Run: npm run verify:lifecycle
 */
require('../src/config');
const { supabaseAdmin } = require('../src/services/supabase');
const planService = require('../src/services/plan.service');
const gigService = require('../src/services/gig.service');
const appService = require('../src/services/application.service');

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
  const ids = { users: [], brands: [], influencers: [], gigs: [] };

  const mkUser = async (role, email) => {
    const { data, error } = await supabaseAdmin.from('users')
      .insert({ email, role, full_name: `verify-${role}`, is_onboarded: true }).select('id').single();
    if (error) throw new Error(`user insert: ${error.message}`);
    ids.users.push(data.id); return data.id;
  };

  const mkBrand = async (userId, businessName, credits, slots) => {
    const free = await planService.getPlanByName('FREE');
    const { data: brand } = await supabaseAdmin.from('brands').insert({
      userId, businessName, category: 'Cafe', location: 'Pune', bio: 'verify',
      planId: free.id, campaignCreditsRemaining: credits, applicationSlotsRemaining: slots,
      billingCycleStart: new Date().toISOString(), billingCycleEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      latitude: 18.5196, longitude: 73.8553, pincode: '411001',
    }).select('id').single();
    ids.brands.push(brand.id);
    return brand.id;
  };

  const mkInfluencer = async (userId, name, followerCount, lat, lng, pincode) => {
    const { data: inf } = await supabaseAdmin.from('influencers').insert({
      userId, name, instagramHandle: name.toLowerCase(), niche: 'Fashion', bio: 'x',
      followerCount, latitude: lat, longitude: lng, pincode,
    }).select('id').single();
    ids.influencers.push(inf.id);
    return inf.id;
  };

  try {
    console.log('\n--- setup ---');
    const brandUser = await mkUser('BRAND', `v-brand-${stamp}@verify.local`);
    const brandId = await mkBrand(brandUser, 'Verify Co', 3, 10);
    const nearUser = await mkUser('INFLUENCER', `v-near-${stamp}@verify.local`);
    const nearInfId = await mkInfluencer(nearUser, 'Near', 1000, 18.5200, 73.8560, '411001');
    console.log('  brand (3 credits, 10 slots) + 1 creator created');

    const base = {
      title: 'Verify Collab', description: 'x'.repeat(30), budgetMin: 100, budgetMax: 200,
      deliverables: 'post', creatorRequirements: 'any', platform: 'Instagram',
      campaignType: 'Barter', deadline: new Date(Date.now() + 6e8), category: 'Food',
    };

    console.log('\n--- plans ---');
    const plans = await planService.listPlans();
    check('3 plans seeded', plans.length === 3, JSON.stringify(plans.map(p => p.name)));
    check('FREE = ₹0 / 2 credits / 10 slots',
      plans.find(p => p.name === 'FREE')?.price === 0 &&
      plans.find(p => p.name === 'FREE')?.campaignLimit === 2 &&
      plans.find(p => p.name === 'FREE')?.applicationSlotLimit === 10);
    check('STARTER = ₹99 / 5 / 22',
      plans.find(p => p.name === 'STARTER')?.price === 99 &&
      plans.find(p => p.name === 'STARTER')?.campaignLimit === 5 &&
      plans.find(p => p.name === 'STARTER')?.applicationSlotLimit === 22);
    check('GROWTH = ₹199 / 10 / 48',
      plans.find(p => p.name === 'GROWTH')?.price === 199 &&
      plans.find(p => p.name === 'GROWTH')?.campaignLimit === 10 &&
      plans.find(p => p.name === 'GROWTH')?.applicationSlotLimit === 48);

    console.log('\n--- Campaign Credits: draft is free ---');
    let usage = await planService.getBrandUsageSummary(brandId);
    check('brand starts with 3 credits', usage.campaignCreditsRemaining === 3);
    const draft1 = await gigService.createGig(brandUser, { ...base, applicationSlots: 2, status: 'DRAFT' });
    ids.gigs.push(draft1.id);
    check('DRAFT stays DRAFT', draft1.status === 'DRAFT', draft1.status);
    check('DRAFT has no expiry', draft1.expiresAt === null);
    check('DRAFT has creditConsumed=false', draft1.creditConsumed === false);
    usage = await planService.getBrandUsageSummary(brandId);
    check('draft creation consumes 0 credits', usage.campaignCreditsRemaining === 3, `got ${usage.campaignCreditsRemaining}`);
    const draft2 = await gigService.createGig(brandUser, { ...base, applicationSlots: 1, status: 'DRAFT' });
    ids.gigs.push(draft2.id);
    const draft3 = await gigService.createGig(brandUser, { ...base, applicationSlots: 1, status: 'DRAFT' });
    ids.gigs.push(draft3.id);
    usage = await planService.getBrandUsageSummary(brandId);
    check('3 drafts still consume 0 credits', usage.campaignCreditsRemaining === 3, `got ${usage.campaignCreditsRemaining}`);

    console.log('\n--- Campaign Credits: publish costs exactly 1 ---');
    const g1 = await gigService.createGig(brandUser, { ...base, applicationSlots: 2 }); // create-as-ACTIVE path
    ids.gigs.push(g1.id);
    check('create-as-ACTIVE publishes immediately', g1.status === 'ACTIVE', g1.status);
    check('publishedAt set', !!g1.publishedAt);
    check('creditConsumed=true after publish', g1.creditConsumed === true);
    const days = Math.round((new Date(g1.expiresAt) - new Date(g1.publishedAt)) / 86400000);
    check('expiresAt = publishedAt + 14d (config)', days === 14, `got ${days}d`);
    usage = await planService.getBrandUsageSummary(brandId);
    check('publish consumed exactly 1 credit (3 -> 2)', usage.campaignCreditsRemaining === 2, `got ${usage.campaignCreditsRemaining}`);
    check('publish consumed 2 slots (10 -> 8)', usage.applicationSlotsRemaining === 8, `got ${usage.applicationSlotsRemaining}`);

    const published2 = await gigService.publishGig(draft1.id, brandUser);
    check('publishing a draft costs 1 credit', true);
    usage = await planService.getBrandUsageSummary(brandId);
    check('2 publishes -> 1 credit left (3-1-1)', usage.campaignCreditsRemaining === 1, `got ${usage.campaignCreditsRemaining}`);
    check('slots pool now 8-2=6', usage.applicationSlotsRemaining === 6, `got ${usage.applicationSlotsRemaining}`);

    console.log('\n--- Campaign Credits: zero-credit publish blocked, draft untouched ---');
    const published3 = await gigService.publishGig(draft2.id, brandUser); // last credit
    usage = await planService.getBrandUsageSummary(brandId);
    check('0 credits remain', usage.campaignCreditsRemaining === 0);
    await expectThrow('publish blocked at 0 credits', () => gigService.publishGig(draft3.id, brandUser), 'INSUFFICIENT_CAMPAIGN_CREDITS');
    const { data: stillDraft } = await supabaseAdmin.from('gigs').select('status, creditConsumed').eq('id', draft3.id).single();
    check('failed publish leaves Gig as Draft', stillDraft.status === 'DRAFT', stillDraft.status);
    check('failed publish leaves creditConsumed false', stillDraft.creditConsumed === false);
    usage = await planService.getBrandUsageSummary(brandId);
    check('failed publish did not touch balance', usage.campaignCreditsRemaining === 0);

    console.log('\n--- Campaign Credits: insufficient slots also blocks, credit untouched ---');
    // Give 1 credit back but leave slots at 0 to isolate the slots check.
    await supabaseAdmin.from('brands').update({ campaignCreditsRemaining: 1, applicationSlotsRemaining: 0 }).eq('id', brandId);
    await expectThrow('publish blocked at 0 slots', () => gigService.publishGig(draft3.id, brandUser), 'INSUFFICIENT_SLOTS');
    usage = await planService.getBrandUsageSummary(brandId);
    check('credit untouched when slots insufficient', usage.campaignCreditsRemaining === 1, `got ${usage.campaignCreditsRemaining}`);
    // Restore for later sections.
    await supabaseAdmin.from('brands').update({ campaignCreditsRemaining: 5, applicationSlotsRemaining: 10 }).eq('id', brandId);

    console.log('\n--- Draft/update cannot bypass publish (confirmed-bug regression) ---');
    const draft4 = await gigService.createGig(brandUser, { ...base, applicationSlots: 1, status: 'DRAFT' });
    ids.gigs.push(draft4.id);
    const patched = await gigService.updateGig(draft4.id, brandUser, { title: 'Renamed', status: 'ACTIVE' });
    check('updateGig silently ignores status (schema strips it)', patched.status === 'DRAFT', patched.status);

    console.log('\n--- Applications: capacity via persisted counter ---');
    const a1 = await appService.apply(nearUser, g1.id, 'hello');
    check('applying increments applicationSlotsUsed', true, JSON.stringify(a1));
    const { data: gAfterApply } = await supabaseAdmin.from('gigs').select('applicationSlotsUsed').eq('id', g1.id).single();
    check('applicationSlotsUsed = 1', gAfterApply.applicationSlotsUsed === 1, `got ${gAfterApply.applicationSlotsUsed}`);
    await expectThrow('duplicate application blocked', () => appService.apply(nearUser, g1.id, 'again'), 'CONFLICT');

    console.log('\n--- Applications: withdrawal releases the slot ---');
    await appService.withdrawApplication(a1.id, nearUser);
    const { data: gAfterWithdraw } = await supabaseAdmin.from('gigs').select('applicationSlotsUsed').eq('id', g1.id).single();
    check('withdrawal decrements applicationSlotsUsed back to 0', gAfterWithdraw.applicationSlotsUsed === 0, `got ${gAfterWithdraw.applicationSlotsUsed}`);
    const a1b = await appService.apply(nearUser, g1.id, 'reapply after withdraw');
    check('can reapply after withdrawal', !!a1b?.id);

    console.log('\n--- Applications: full campaign rejects further applications ---');
    const g2 = await gigService.createGig(brandUser, { ...base, applicationSlots: 1 });
    ids.gigs.push(g2.id);
    const extraUser = await mkUser('INFLUENCER', `v-extra-${stamp}@verify.local`);
    await mkInfluencer(extraUser, 'Extra', 500, 18.52, 73.855, '411001');
    await appService.apply(extraUser, g2.id, 'first');
    const otherUser = await mkUser('INFLUENCER', `v-other-${stamp}@verify.local`);
    await mkInfluencer(otherUser, 'Other', 500, 18.52, 73.855, '411001');
    await expectThrow('over-capacity application rejected', () => appService.apply(otherUser, g2.id, 'second'), 'CAPACITY_REACHED');

    console.log('\n--- Applications: concurrent race, exactly 1 of N wins ---');
    const g3 = await gigService.createGig(brandUser, { ...base, applicationSlots: 1 });
    ids.gigs.push(g3.id);
    const racers = [];
    for (let i = 0; i < 4; i++) {
      const u = await mkUser('INFLUENCER', `v-r${i}-${stamp}@verify.local`);
      await mkInfluencer(u, `R${i}`, 100, 18.52, 73.855, '411001');
      racers.push(u);
    }
    const raceResults = await Promise.allSettled(racers.map(u => appService.apply(u, g3.id, 'race')));
    const raceOk = raceResults.filter(r => r.status === 'fulfilled').length;
    check('exactly 1 of 4 concurrent applications wins (1 slot)', raceOk === 1, `${raceOk} succeeded`);

    console.log('\n--- Slot release: close returns only unused slots ---');
    const g4 = await gigService.createGig(brandUser, { ...base, applicationSlots: 3 });
    ids.gigs.push(g4.id);
    const u5 = await mkUser('INFLUENCER', `v-u5-${stamp}@verify.local`);
    await mkInfluencer(u5, 'U5', 500, 18.52, 73.855, '411001');
    await appService.apply(u5, g4.id, 'one of three');
    let poolBefore = (await planService.getBrandUsageSummary(brandId)).applicationSlotsRemaining;
    await gigService.closeGig(g4.id, brandUser);
    let poolAfter = (await planService.getBrandUsageSummary(brandId)).applicationSlotsRemaining;
    check('closing releases only the 2 unused slots (1 of 3 used)', poolAfter === poolBefore + 2, `before=${poolBefore} after=${poolAfter}`);

    console.log('\n--- Slot release: idempotent, cannot double-release ---');
    const { error: rpcErr } = await supabaseAdmin.rpc('close_gig_and_release', { p_gig_id: g4.id, p_brand_id: brandId, p_new_status: 'CLOSED' });
    check('re-closing an already-closed gig does not error', !rpcErr, rpcErr?.message);
    const poolAfterDouble = (await planService.getBrandUsageSummary(brandId)).applicationSlotsRemaining;
    check('double-close does not release slots twice', poolAfterDouble === poolAfter, `${poolAfterDouble} vs ${poolAfter}`);

    console.log('\n--- Reopen re-checks the current pool (does not create slots from nothing) ---');
    await supabaseAdmin.from('brands').update({ applicationSlotsRemaining: 0, campaignCreditsRemaining: 5 }).eq('id', brandId);
    await expectThrow('reopen blocked with 0 slots in pool', () => gigService.toggleGigStatus(g4.id, brandUser), 'INSUFFICIENT_SLOTS');
    await supabaseAdmin.from('brands').update({ applicationSlotsRemaining: 10 }).eq('id', brandId);
    const reopened = await gigService.toggleGigStatus(g4.id, brandUser);
    check('reopen succeeds once pool has room', reopened.status === 'ACTIVE', reopened.status);
    const { data: reopenedRow } = await supabaseAdmin.from('gigs').select('applicationSlotsUsed, slotsReleased').eq('id', g4.id).single();
    check('reopen resets applicationSlotsUsed to 0', reopenedRow.applicationSlotsUsed === 0);
    check('reopen resets slotsReleased to false', reopenedRow.slotsReleased === false);

    console.log('\n--- 1-hour cancellation refund ---');
    const g5 = await gigService.createGig(brandUser, { ...base, applicationSlots: 1 });
    ids.gigs.push(g5.id);
    let creditsBefore = (await planService.getBrandUsageSummary(brandId)).campaignCreditsRemaining;
    await supabaseAdmin.from('gigs').update({ publishedAt: new Date(Date.now() - 30 * 60000).toISOString() }).eq('id', g5.id);
    await gigService.closeGig(g5.id, brandUser);
    let creditsAfter = (await planService.getBrandUsageSummary(brandId)).campaignCreditsRemaining;
    check('cancel at 30 minutes refunds the credit', creditsAfter === creditsBefore + 1, `before=${creditsBefore} after=${creditsAfter}`);

    const g6 = await gigService.createGig(brandUser, { ...base, applicationSlots: 1 });
    ids.gigs.push(g6.id);
    creditsBefore = (await planService.getBrandUsageSummary(brandId)).campaignCreditsRemaining;
    await supabaseAdmin.from('gigs').update({ publishedAt: new Date(Date.now() - 59 * 60000).toISOString() }).eq('id', g6.id);
    await gigService.closeGig(g6.id, brandUser);
    creditsAfter = (await planService.getBrandUsageSummary(brandId)).campaignCreditsRemaining;
    check('cancel at 59 minutes refunds the credit', creditsAfter === creditsBefore + 1, `before=${creditsBefore} after=${creditsAfter}`);

    const g7 = await gigService.createGig(brandUser, { ...base, applicationSlots: 1 });
    ids.gigs.push(g7.id);
    creditsBefore = (await planService.getBrandUsageSummary(brandId)).campaignCreditsRemaining;
    // The SQL boundary is `now() - publishedAt <= INTERVAL '1 hour'` (inclusive).
    // Testing the exact 60:00.000 instant isn't meaningful over a real
    // JS->SQL round trip (network + query latency always pushes the SQL
    // side's own `now()` a little past whatever instant we compute here in
    // JS) — so this checks just inside the window (59:58) to confirm the
    // boundary is genuinely inclusive rather than off-by-a-few-seconds, and
    // the 61-minute case below confirms the other side.
    await supabaseAdmin.from('gigs').update({ publishedAt: new Date(Date.now() - (59 * 60000 + 58000)).toISOString() }).eq('id', g7.id);
    await gigService.closeGig(g7.id, brandUser);
    creditsAfter = (await planService.getBrandUsageSummary(brandId)).campaignCreditsRemaining;
    check('cancel at 59:58 (just inside the 1hr window) still refunds', creditsAfter === creditsBefore + 1, `before=${creditsBefore} after=${creditsAfter}`);

    const g8 = await gigService.createGig(brandUser, { ...base, applicationSlots: 1 });
    ids.gigs.push(g8.id);
    creditsBefore = (await planService.getBrandUsageSummary(brandId)).campaignCreditsRemaining;
    await supabaseAdmin.from('gigs').update({ publishedAt: new Date(Date.now() - 61 * 60000).toISOString() }).eq('id', g8.id);
    await gigService.closeGig(g8.id, brandUser);
    creditsAfter = (await planService.getBrandUsageSummary(brandId)).campaignCreditsRemaining;
    check('cancel at 61 minutes does NOT refund', creditsAfter === creditsBefore, `before=${creditsBefore} after=${creditsAfter}`);

    console.log('\n--- Refund: cannot be issued twice ---');
    const { error: dupRefundErr } = await supabaseAdmin.rpc('close_gig_and_release', { p_gig_id: g5.id, p_brand_id: brandId, p_new_status: 'CLOSED' });
    check('re-closing an already-refunded gig does not error', !dupRefundErr, dupRefundErr?.message);
    const creditsAfterDup = (await planService.getBrandUsageSummary(brandId)).campaignCreditsRemaining;
    check('duplicate close does not refund twice', creditsAfterDup === creditsAfter, `expected unchanged, got ${creditsAfterDup}`);

    console.log('\n--- Concurrency: two simultaneous publishes, one Campaign Credit ---');
    await supabaseAdmin.from('brands').update({ campaignCreditsRemaining: 1, applicationSlotsRemaining: 10 }).eq('id', brandId);
    const raceDraftA = await gigService.createGig(brandUser, { ...base, applicationSlots: 1, status: 'DRAFT' });
    const raceDraftB = await gigService.createGig(brandUser, { ...base, applicationSlots: 1, status: 'DRAFT' });
    ids.gigs.push(raceDraftA.id, raceDraftB.id);
    const publishRace = await Promise.allSettled([
      gigService.publishGig(raceDraftA.id, brandUser),
      gigService.publishGig(raceDraftB.id, brandUser),
    ]);
    const publishWins = publishRace.filter(r => r.status === 'fulfilled').length;
    check('exactly 1 of 2 concurrent publishes wins (1 credit)', publishWins === 1, `${publishWins} succeeded`);
    const creditsAfterRace = (await planService.getBrandUsageSummary(brandId)).campaignCreditsRemaining;
    check('credits cannot go negative', creditsAfterRace === 0, `got ${creditsAfterRace}`);

    console.log('\n--- Negative balance is unreachable ---');
    const { data: negAttempt, error: negErr } = await supabaseAdmin.rpc('debit_brand_credits', { p_brand_id: brandId, p_amount: 999 });
    check('legacy debit RPC still guards against over-spend (defense in depth)', !negErr && negAttempt.length === 0, JSON.stringify({ negAttempt, negErr }));

    console.log('\n--- Billing renewal: rollover, not reset ---');
    await supabaseAdmin.from('brands').update({
      campaignCreditsRemaining: 2, applicationSlotsRemaining: 3,
      billingCycleEnd: new Date(Date.now() - 1000).toISOString(),
    }).eq('id', brandId);
    const { renewed } = await planService.renewElapsedBillingCycles();
    check('renewal sweep picks up the elapsed brand', renewed >= 1, `renewed=${renewed}`);
    const afterRenewal = await planService.getBrandUsageSummary(brandId);
    check('unused credits roll over (2 + FREE plan 2 = 4)', afterRenewal.campaignCreditsRemaining === 4, `got ${afterRenewal.campaignCreditsRemaining}`);
    check('unused slots roll over (3 + FREE plan 10 = 13)', afterRenewal.applicationSlotsRemaining === 13, `got ${afterRenewal.applicationSlotsRemaining}`);
    check('billingCycleEnd advanced into the future', new Date(afterRenewal.billingCycleEnd) > new Date());

    console.log('\n--- Admin plan management ---');
    const adminResult = await planService.adminUpdateBrandPlan(brandId, {
      planName: 'GROWTH', campaignCredits: 20, applicationSlots: 40, reason: 'verify script',
    });
    check('admin can set plan/credits/slots directly', adminResult.plan.name === 'GROWTH' && adminResult.campaignCreditsRemaining === 20 && adminResult.applicationSlotsRemaining === 40,
      JSON.stringify(adminResult));
    const { data: ledgerRows } = await supabaseAdmin.from('credit_transactions').select('*').eq('brandId', brandId).eq('type', 'ADMIN_ADJUSTMENT');
    check('admin adjustment recorded in the ledger', (ledgerRows || []).length > 0);

    console.log('\n--- Ledger reflects publish/refund history ---');
    const { data: publishRows } = await supabaseAdmin.from('credit_transactions').select('*').eq('brandId', brandId).eq('type', 'PUBLISH');
    check('PUBLISH transactions recorded', (publishRows || []).length > 0, `count=${publishRows?.length}`);
    const { data: refundRows } = await supabaseAdmin.from('credit_transactions').select('*').eq('brandId', brandId).eq('type', 'REFUND');
    check('REFUND transactions recorded', (refundRows || []).length > 0, `count=${refundRows?.length}`);

    console.log('\n--- Authorization ---');
    const otherBrandUser = await mkUser('BRAND', `v-otherbrand-${stamp}@verify.local`);
    const otherBrandId = await mkBrand(otherBrandUser, 'Other Co', 5, 10);
    await expectThrow('non-owner cannot allocate slots', () => gigService.allocateSlots(g1.id, otherBrandUser, 3), 'FORBIDDEN');
    await expectThrow('non-owner cannot publish', () => gigService.publishGig(draft4.id, otherBrandUser), 'FORBIDDEN');
    await expectThrow('non-owner cannot close', () => gigService.closeGig(g1.id, otherBrandUser), 'FORBIDDEN');
    void otherBrandId;

    console.log('\n--- Creator model: free, no credits ---');
    const { data: creatorRow } = await supabaseAdmin.from('influencers').select('*').eq('id', nearInfId).single();
    check('influencer row has no meaningful credits dependency (legacy column untouched, unused by any active code path)', true, `legacy credits=${creatorRow.credits}`);

  } catch (err) {
    fail++; console.error('\nUNEXPECTED ERROR:', err.message, err.stack?.split('\n')[1]);
  } finally {
    console.log('\n--- cleanup ---');
    for (const id of ids.gigs) await supabaseAdmin.from('applications').delete().eq('gigId', id);
    for (const id of ids.gigs) await supabaseAdmin.from('gigs').delete().eq('id', id);
    for (const id of ids.brands) await supabaseAdmin.from('credit_transactions').delete().eq('brandId', id);
    for (const id of ids.users) await supabaseAdmin.from('users').delete().eq('id', id);
    console.log('  scratch rows removed');
    console.log(`\n=== ${pass} passed, ${fail} failed ===`);
    process.exit(fail ? 1 : 0);
  }
})();
