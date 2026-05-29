const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { parsePagination, paginateResults } = require('../utils/pagination');

/**
 * Helper to retrieve brand associated with userId.
 */
const getBrandByUserId = async (userId) => {
  const brand = await prisma.brand.findUnique({ where: { userId } });
  if (!brand) {
    throw new AppError('Complete your brand onboarding to perform this action.', 400, 'ONBOARDING_REQUIRED');
  }
  return brand;
};

/**
 * Create a new Gig.
 */
const createGig = async (userId, data) => {
  const brand = await getBrandByUserId(userId);

  return prisma.gig.create({
    data: {
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
    },
    include: {
      brand: true,
    },
  });
};

/**
 * Get all open gigs with filters, search, and cursor-based pagination.
 */
const getGigs = async (filters) => {
  const { cursor, limit } = parsePagination(filters, 12);
  const { search, category, sort } = filters;

  const where = {
    status: 'OPEN',
    city: 'Pune',
  };

  if (category) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  let orderBy = { createdAt: 'desc' };
  if (sort === 'budget_high') {
    orderBy = { budgetMin: 'desc' };
  } else if (sort === 'budget_low') {
    orderBy = { budgetMin: 'asc' };
  }

  // To implement cursor pagination: fetch limit + 1 items
  const gigs = await prisma.gig.findMany({
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    where,
    orderBy,
    include: {
      brand: {
        select: {
          id: true,
          businessName: true,
          category: true,
          logoUrl: true,
          user: {
            select: {
              lastActiveAt: true,
            },
          },
        },
      },
      _count: {
        select: {
          applications: true,
        },
      },
    },
  });

  const total = await prisma.gig.count({ where });
  const paginated = paginateResults(gigs, limit);
  paginated.pagination.total = total;

  return paginated;
};

/**
 * Fetch a single Gig by ID. Increments viewCount if visited by non-owner.
 */
const getGigById = async (id, userId) => {
  const gig = await prisma.gig.findUnique({
    where: { id },
    include: {
      brand: {
        select: {
          id: true,
          userId: true,
          businessName: true,
          category: true,
          location: true,
          bio: true,
          logoUrl: true,
          website: true,
          user: {
            select: {
              lastActiveAt: true,
            },
          },
        },
      },
      _count: {
        select: {
          applications: true,
        },
      },
    },
  });

  if (!gig) {
    throw new AppError('This collab does not exist or has been deleted.', 404, 'NOT_FOUND');
  }

  // Increment viewCount if user is not the creator brand
  if (gig.brand.userId !== userId) {
    await prisma.gig.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    gig.viewCount += 1; // update local representation
  }

  // Check if current user is an influencer and if they've applied
  let hasApplied = false;
  let application = null;

  const influencer = await prisma.influencer.findUnique({ where: { userId } });
  if (influencer) {
    application = await prisma.application.findUnique({
      where: {
        gigId_influencerId: {
          gigId: id,
          influencerId: influencer.id,
        },
      },
    });
    hasApplied = !!application;
  }

  return {
    ...gig,
    hasApplied,
    application,
  };
};

/**
 * Update an existing Gig.
 */
const updateGig = async (id, userId, data) => {
  const brand = await getBrandByUserId(userId);
  const gig = await prisma.gig.findUnique({ where: { id } });

  if (!gig) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to edit this collab.", 403, 'FORBIDDEN');
  }

  return prisma.gig.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax !== undefined ? data.budgetMax : undefined,
      deliverables: data.deliverables,
      deadline: data.deadline,
      category: data.category,
      status: data.status,
    },
    include: {
      brand: true,
    },
  });
};

/**
 * Soft-close a Gig (sets status to CLOSED).
 */
const closeGig = async (id, userId) => {
  const brand = await getBrandByUserId(userId);
  const gig = await prisma.gig.findUnique({ where: { id } });

  if (!gig) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to close this collab.", 403, 'FORBIDDEN');
  }

  return prisma.gig.update({
    where: { id },
    data: { status: 'CLOSED' },
  });
};

/**
 * Get brand's own posted gigs.
 */
const getMyGigs = async (userId) => {
  const brand = await getBrandByUserId(userId);

  return prisma.gig.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          applications: true,
        },
      },
    },
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
