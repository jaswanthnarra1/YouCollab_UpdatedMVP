/**
 * Throwaway end-to-end check for the gig-lifecycle / plan / slot rules.
 * Talks to the real database, creates its own scratch rows, and cleans up.
 * Run: npm run verify:lifecycle
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

  try {
    console.log('\n--- setup ---');
    const brandUser = await mkUser('BRAND', `v-brand-${stamp}@verify.local`);
    const { data: brand } = await supabaseAdmin.from('brands').insert({
      userId: brandUser, businessName: 'Verify Co', category: 'Cafe', location: 'Pune',
      bio: 'verify', credits: 100000, latitude: 18.5196, longitude: 73.8553, pincode: '411001',
    }).select('id').single();
    ids.brands.push(brand.id);

    const near = await mkUser('INFLUENCER', `v-near-${stamp}@verify.local`);
    const { data: nearInf } = await supabaseAdmin.from('influencers').insert({
      userId: near, name: 'Near', instagramHandle: 'near', niche: 'Fashion', bio: 'x',
      followerCount: 1000, latitude: 18.5200, longitude: 73.8560, pincode: '411001',
    }).select('id').single();
    ids.influencers.push(nearInf.id);

    const far = await mkUser('INFLUENCER', `v-far-${stamp}@verify.local`);
    const { data: farInf } = await supabaseAdmin.from('influencers').insert({
      userId: far, name: 'Far', instagramHandle: 'far', niche: 'Fashion', bio: 'x',
      followerCount: 1000, latitude: 19.9975, longitude: 73.7898, pincode: '422001', // Nashik ~165km
    }).select('id').single();
    ids.influencers.push(farInf.id);
    console.log('  brand + 2 creators created');

    console.log('\n--- plans ---');
    const plans = await planService.listPlans();
    check('3 plans seeded', plans.length === 3, JSON.stringify(plans.map(p => p.name)));
    check('FREE = 2 campaigns / 12 slots',
      plans.find(p => p.name === 'FREE')?.campaignLimit === 2 && plans.find(p => p.name === 'FREE')?.applicationSlotLimit === 12);
    check('STARTER = ₹99 / 5 / 36',
      plans.find(p => p.name === 'STARTER')?.price === 99 && plans.find(p => p.name === 'STARTER')?.campaignLimit === 5);
    check('GROWTH = 10 / 64',
      plans.find(p => p.name === 'GROWTH')?.campaignLimit === 10 && plans.find(p => p.name === 'GROWTH')?.applicationSlotLimit === 64);

    let usage = await planService.getBrandPlanUsage(brand.id);
    check('new brand defaults to FREE', usage.plan.name === 'FREE', usage.plan.name);
    check('usage starts at 0 campaigns', usage.campaignsUsed === 0);

    console.log('\n--- gig lifecycle ---');
    const base = {
      title: 'Verify Collab', description: 'x'.repeat(30), budgetMin: 100, budgetMax: 200,
      deliverables: 'post', creatorRequirements: 'any', platform: 'Instagram',
      campaignType: 'Barter', deadline: new Date(Date.now() + 6e8), category: 'Food',
    };
    const g1 = await gigService.createGig(brandUser, { ...base, applicationSlots: 2 });
    ids.gigs.push(g1.id);
    check('publish sets ACTIVE', g1.status === 'ACTIVE', g1.status);
    check('publishedAt set', !!g1.publishedAt);
    const days = Math.round((new Date(g1.expiresAt) - new Date(g1.publishedAt)) / 86400000);
    check('expiresAt = publishedAt + 14d (config)', days === 14, `got ${days}d`);

    const draft = await gigService.createGig(brandUser, { ...base, status: 'DRAFT' });
    ids.gigs.push(draft.id);
    check('DRAFT stays DRAFT', draft.status === 'DRAFT', draft.status);
    check('DRAFT has no expiry', draft.expiresAt === null);

    usage = await planService.getBrandPlanUsage(brand.id);
    check('DRAFT does not consume a campaign', usage.campaignsUsed === 1, `used=${usage.campaignsUsed}`);

    console.log('\n--- campaign limits (FREE = 2) ---');
    const g2 = await gigService.createGig(brandUser, { ...base, applicationSlots: 1 });
    ids.gigs.push(g2.id);
    usage = await planService.getBrandPlanUsage(brand.id);
    check('2 active campaigns used', usage.campaignsUsed === 2);
    check('campaignsRemaining = 0', usage.campaignsRemaining === 0);
    await expectThrow('3rd campaign blocked on FREE',
      () => gigService.createGig(brandUser, base), 'CAMPAIGN_LIMIT_REACHED');

    console.log('\n--- slot allocation ---');
    await expectThrow('slots below 1 rejected',
      () => planService.assertSlotsWithinPlan(brand.id, 0), 'INVALID_SLOTS');
    await expectThrow('slots over plan total rejected',
      () => planService.assertSlotsWithinPlan(brand.id, 99, g1.id), 'SLOT_LIMIT_EXCEEDED');
    const realloc = await gigService.allocateSlots(g1.id, brandUser, 5);
    check('allocateSlots updates', realloc.applicationSlots === 5, String(realloc.applicationSlots));
    usage = await planService.getBrandPlanUsage(brand.id);
    check('slotsAllocated reflects 5+1', usage.slotsAllocated === 6, String(usage.slotsAllocated));
    check('slotsRemaining = 12-6', usage.slotsRemaining === 6, String(usage.slotsRemaining));
    await gigService.allocateSlots(g1.id, brandUser, 2); // back to 2 for capacity test

    console.log('\n--- applications ---');
    const a1 = await appService.apply(near, g1.id, 'hello from nearby');
    check('nearby creator can apply', !!a1?.id);
    await expectThrow('duplicate application blocked',
      () => appService.apply(near, g1.id, 'again'), 'CONFLICT');

    console.log('\n--- radius enforcement ---');
    await supabaseAdmin.from('gigs').update({ radiusKm: 10 }).eq('id', g2.id);
    await expectThrow('far creator blocked by radius',
      () => appService.apply(far, g2.id, 'from Nashik'), 'OUTSIDE_RADIUS');
    const a2 = await appService.apply(near, g2.id, 'nearby ok');
    check('nearby creator passes radius', !!a2?.id);

    console.log('\n--- capacity ---');
    // g1 has 2 slots, 1 used. Fill it, then the next must be rejected.
    const extra = await mkUser('INFLUENCER', `v-x-${stamp}@verify.local`);
    const { data: xInf } = await supabaseAdmin.from('influencers').insert({
      userId: extra, name: 'X', instagramHandle: 'x', niche: 'Fashion', bio: 'x',
      followerCount: 500, latitude: 18.52, longitude: 73.855, pincode: '411001',
    }).select('id').single();
    ids.influencers.push(xInf.id);
    await appService.apply(extra, g1.id, 'second');
    await expectThrow('over-capacity application rejected',
      () => appService.apply(far, g1.id, 'third'), 'CAPACITY_REACHED');

    console.log('\n--- expiry ---');
    await supabaseAdmin.from('gigs')
      .update({ expiresAt: new Date(Date.now() - 1000).toISOString() }).eq('id', g2.id);
    await expectThrow('lapsed gig rejects applications before sweep runs',
      () => appService.apply(far, g2.id, 'late'), 'GIG_EXPIRED');
    const swept = await gigService.expireLapsedGigs();
    check('sweep expires lapsed gigs', swept.ids.includes(g2.id), JSON.stringify(swept));
    const { data: after } = await supabaseAdmin.from('gigs').select('status').eq('id', g2.id).single();
    check('status is EXPIRED after sweep', after.status === 'EXPIRED', after.status);
    const again = await gigService.expireLapsedGigs();
    check('sweep is idempotent', !again.ids.includes(g2.id));
    await expectThrow('EXPIRED gig rejects applications',
      () => appService.apply(far, g2.id, 'nope'), 'GIG_EXPIRED');

    console.log('\n--- race condition ---');
    const g3 = await gigService.createGig(brandUser, { ...base, applicationSlots: 1 });
    ids.gigs.push(g3.id);
    const racers = [];
    for (let i = 0; i < 4; i++) {
      const u = await mkUser('INFLUENCER', `v-r${i}-${stamp}@verify.local`);
      const { data: inf } = await supabaseAdmin.from('influencers').insert({
        userId: u, name: `R${i}`, instagramHandle: `r${i}`, niche: 'Fashion', bio: 'x',
        followerCount: 100, latitude: 18.52, longitude: 73.855, pincode: '411001',
      }).select('id').single();
      ids.influencers.push(inf.id); racers.push(u);
    }
    const results = await Promise.allSettled(racers.map(u => appService.apply(u, g3.id, 'race')));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    check('exactly 1 of 4 concurrent applications wins (1 slot)', ok === 1, `${ok} succeeded`);

    console.log('\n--- draft publish flow (UI-backed endpoints) ---');
    // Free a campaign slot first: FREE allows 2, and g1 + g3 are both live.
    await gigService.toggleGigStatus(g3.id, brandUser); // g3 -> CLOSED
    const published = await gigService.publishGig(draft.id, brandUser);
    check('draft publishes to ACTIVE', published.status === 'ACTIVE', published.status);
    check('publish sets publishedAt', !!published.publishedAt);
    check('publish sets a fresh expiry', !!published.expiresAt);

    console.log('\n--- slot editor bounds ---');
    await expectThrow('cannot allocate below applications already received',
      () => gigService.allocateSlots(g1.id, brandUser, 1), 'SLOTS_BELOW_RECEIVED');
    const widened = await gigService.allocateSlots(g1.id, brandUser, 4);
    check('widening allocation succeeds', widened.applicationSlots === 4, String(widened.applicationSlots));

    console.log('\n--- authorization ---');
    const otherUser = await mkUser('BRAND', `v-other-${stamp}@verify.local`);
    const { data: other } = await supabaseAdmin.from('brands').insert({
      userId: otherUser, businessName: 'Other', category: 'Cafe', location: 'Pune', bio: 'x', credits: 1000,
    }).select('id').single();
    ids.brands.push(other.id);
    await expectThrow('non-owner cannot allocate slots',
      () => gigService.allocateSlots(g1.id, otherUser, 3), 'FORBIDDEN');
    await expectThrow('non-owner cannot publish',
      () => gigService.publishGig(draft.id, otherUser), 'FORBIDDEN');
    await expectThrow('publishing an ACTIVE gig rejected',
      () => gigService.publishGig(g1.id, brandUser), 'ALREADY_ACTIVE');

  } catch (err) {
    fail++; console.error('\nUNEXPECTED ERROR:', err.message, err.stack?.split('\n')[1]);
  } finally {
    console.log('\n--- cleanup ---');
    for (const id of ids.gigs) await supabaseAdmin.from('gigs').delete().eq('id', id);
    for (const id of ids.users) await supabaseAdmin.from('users').delete().eq('id', id);
    console.log('  scratch rows removed');
    console.log(`\n=== ${pass} passed, ${fail} failed ===`);
    process.exit(fail ? 1 : 0);
  }
})();
