const supabase = require('./supabase');
const AppError = require('../utils/AppError');
const { parsePagination, paginateResults } = require('../utils/pagination');

/**
 * Helper to retrieve brand associated with userId.
 */
const getBrandByUserId = async (userId) => {
  const { data: brand, error } = await supabase
    .from('brands')
    .select('*')
    .eq('userId', userId)
    .maybeSingle();

  if (error || !brand) {
    throw new AppError('Complete your brand onboarding to perform this action.', 400, 'ONBOARDING_REQUIRED');
  }
  return brand;
};

/**
 * Create a new Gig.
 */
const createGig = async (userId, data) => {
  const brand = await getBrandByUserId(userId);

  const { data: newGig, error } = await supabase
    .from('gigs')
    .insert({
      brandId: brand.id,
      title: data.title,
      description: data.description,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax || null,
      deliverables: data.deliverables,
      deadline: data.deadline,
      category: data.category,
      city: 'Pune', // MVP constraint
      status: 'OPEN',
    })
    .select('*, brand:brands(*)')
    .single();

  if (error) {
    throw new AppError('Failed to create collab.', 500, 'DATABASE_ERROR');
  }

  return newGig;
};

/**
 * Get all open gigs with filters, search, and cursor-based pagination.
 */
const getGigs = async (filters) => {
  const { cursor, limit } = parsePagination(filters, 12);
  const { search, category, sort } = filters;

  let query = supabase
    .from('gigs')
    .select('*, brand:brands(id, businessName, category, logoUrl, user:users(lastActiveAt)), applications(count)', { count: 'exact' })
    .eq('status', 'OPEN')
    .eq('city', 'Pune');

  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Handle ordering and cursor-based filtering
  if (sort === 'budget_high') {
    if (cursor) {
      const { data: cursorItem } = await supabase
        .from('gigs')
        .select('budgetMin, id')
        .eq('id', cursor)
        .maybeSingle();
      if (cursorItem) {
        query = query.or(`budgetMin.lt.${cursorItem.budgetMin},and(budgetMin.eq.${cursorItem.budgetMin},id.lt.${cursorItem.id})`);
      }
    }
    query = query.order('budgetMin', { ascending: false }).order('id', { ascending: false });
  } else if (sort === 'budget_low') {
    if (cursor) {
      const { data: cursorItem } = await supabase
        .from('gigs')
        .select('budgetMin, id')
        .eq('id', cursor)
        .maybeSingle();
      if (cursorItem) {
        query = query.or(`budgetMin.gt.${cursorItem.budgetMin},and(budgetMin.eq.${cursorItem.budgetMin},id.gt.${cursorItem.id})`);
      }
    }
    query = query.order('budgetMin', { ascending: true }).order('id', { ascending: true });
  } else {
    // Default: Sort by createdAt desc
    if (cursor) {
      const { data: cursorItem } = await supabase
        .from('gigs')
        .select('createdAt, id')
        .eq('id', cursor)
        .maybeSingle();
      if (cursorItem) {
        query = query.or(`createdAt.lt.${cursorItem.createdAt},and(createdAt.eq.${cursorItem.createdAt},id.lt.${cursorItem.id})`);
      }
    }
    query = query.order('createdAt', { ascending: false }).order('id', { ascending: false });
  }

  // Fetch limit + 1 items to see if there is a next page
  const { data: gigs, error, count: total } = await query.limit(limit + 1);

  if (error) {
    throw new AppError('Failed to fetch collabs.', 500, 'DATABASE_ERROR');
  }

  const formattedGigs = (gigs || []).map(gig => {
    const appCount = gig.applications && gig.applications[0] ? gig.applications[0].count : 0;
    const { applications, ...rest } = gig;
    return {
      ...rest,
      _count: {
        applications: appCount
      }
    };
  });

  const paginated = paginateResults(formattedGigs, limit);
  paginated.pagination.total = total || 0;

  return paginated;
};

/**
 * Fetch a single Gig by ID. Increments viewCount if visited by non-owner.
 */
const getGigById = async (id, userId) => {
  const { data: gig, error } = await supabase
    .from('gigs')
    .select('*, brand:brands(id, userId, businessName, category, location, bio, logoUrl, website, user:users(lastActiveAt)), applications(count)')
    .eq('id', id)
    .maybeSingle();

  if (error || !gig) {
    throw new AppError('This collab does not exist or has been deleted.', 404, 'NOT_FOUND');
  }

  // Increment viewCount if user is not the creator brand
  if (gig.brand.userId !== userId) {
    await supabase.rpc('increment_view_count', { gig_id: id });
    gig.viewCount += 1;
  }

  // Check if current user is an influencer and if they've applied
  let hasApplied = false;
  let application = null;

  const { data: influencer } = await supabase
    .from('influencers')
    .select('id')
    .eq('userId', userId)
    .maybeSingle();

  if (influencer) {
    const { data: appData } = await supabase
      .from('applications')
      .select('*')
      .eq('gigId', id)
      .eq('influencerId', influencer.id)
      .maybeSingle();

    if (appData) {
      application = appData;
      hasApplied = true;
    }
  }

  const appCount = gig.applications && gig.applications[0] ? gig.applications[0].count : 0;
  const { applications, ...rest } = gig;

  return {
    ...rest,
    _count: {
      applications: appCount,
    },
    hasApplied,
    application,
  };
};

/**
 * Update an existing Gig.
 */
const updateGig = async (id, userId, data) => {
  const brand = await getBrandByUserId(userId);

  const { data: gig, error: findError } = await supabase
    .from('gigs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (findError || !gig) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to edit this collab.", 403, 'FORBIDDEN');
  }

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.budgetMin !== undefined) updateData.budgetMin = data.budgetMin;
  if (data.budgetMax !== undefined) updateData.budgetMax = data.budgetMax;
  if (data.deliverables !== undefined) updateData.deliverables = data.deliverables;
  if (data.deadline !== undefined) updateData.deadline = data.deadline;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.status !== undefined) updateData.status = data.status;

  const { data: updatedGig, error: updateError } = await supabase
    .from('gigs')
    .update(updateData)
    .eq('id', id)
    .select('*, brand:brands(*)')
    .single();

  if (updateError) {
    throw new AppError('Failed to update collab.', 500, 'DATABASE_ERROR');
  }

  return updatedGig;
};

/**
 * Soft-close a Gig (sets status to CLOSED).
 */
const closeGig = async (id, userId) => {
  const brand = await getBrandByUserId(userId);

  const { data: gig, error: findError } = await supabase
    .from('gigs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (findError || !gig) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to close this collab.", 403, 'FORBIDDEN');
  }

  const { data: updatedGig, error: updateError } = await supabase
    .from('gigs')
    .update({ status: 'CLOSED' })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    throw new AppError('Failed to close collab.', 500, 'DATABASE_ERROR');
  }

  return updatedGig;
};

/**
 * Get brand's own posted gigs.
 */
const getMyGigs = async (userId) => {
  const brand = await getBrandByUserId(userId);

  const { data: gigs, error } = await supabase
    .from('gigs')
    .select('*, applications(count)')
    .eq('brandId', brand.id)
    .order('createdAt', { ascending: false });

  if (error) {
    throw new AppError('Failed to fetch your collabs.', 500, 'DATABASE_ERROR');
  }

  return (gigs || []).map(gig => {
    const appCount = gig.applications && gig.applications[0] ? gig.applications[0].count : 0;
    const { applications, ...rest } = gig;
    return {
      ...rest,
      _count: {
        applications: appCount
      }
    };
  });
};

module.exports = {
  createGig,
  getGigs,
  getGigById,
  updateGig,
  closeGig,
  getMyGigs,
};
