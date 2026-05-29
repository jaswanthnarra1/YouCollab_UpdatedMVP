const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { parsePagination, paginateResults } = require('../utils/pagination');
const notificationService = require('./notification.service');

/**
 * Helper to retrieve influencer associated with userId.
 */
const getInfluencerByUserId = async (userId) => {
  const influencer = await prisma.influencer.findUnique({ where: { userId } });
  if (!influencer) {
    throw new AppError('Complete your creator onboarding to apply for collabs.', 400, 'ONBOARDING_REQUIRED');
  }
  return influencer;
};

/**
 * Apply to a Gig.
 */
const apply = async (userId, gigId, coverNote) => {
  const influencer = await getInfluencerByUserId(userId);

  const gig = await prisma.gig.findUnique({
    where: { id: gigId },
    include: {
      brand: {
        select: {
          id: true,
          userId: true,
          businessName: true,
        },
      },
    },
  });

  if (!gig) {
    throw new AppError('This collab does not exist or has been deleted.', 404, 'NOT_FOUND');
  }

  if (gig.status !== 'OPEN') {
    throw new AppError('This collab is closed for applications.', 400, 'BAD_REQUEST');
  }

  // Check for duplicate application
  const existingApplication = await prisma.application.findUnique({
    where: {
      gigId_influencerId: {
        gigId,
        influencerId: influencer.id,
      },
    },
  });

  if (existingApplication) {
    throw new AppError("You've already applied to this collab! Sit tight.", 409, 'CONFLICT');
  }

  // Create application and in-app notification in a transaction
  const application = await prisma.$transaction(async (tx) => {
    const appRecord = await tx.application.create({
      data: {
        gigId,
        influencerId: influencer.id,
        coverNote,
        status: 'PENDING',
      },
    });

    // Notify brand owner
    await tx.notification.create({
      data: {
        userId: gig.brand.userId,
        type: 'APPLICATION_RECEIVED',
        title: 'New application! 🎉',
        message: `${influencer.name} applied to your collab "${gig.title}"`,
        metadata: JSON.stringify({
          gigId,
          applicationId: appRecord.id,
          influencerId: influencer.id,
        }),
      },
    });

    return appRecord;
  });

  return application;
};

/**
 * Get all applications for a specific Gig (Brand Owner only).
 */
const getGigApplications = async (gigId, userId, filters) => {
  const brand = await prisma.brand.findUnique({ where: { userId } });
  if (!brand) {
    throw new AppError('Brand onboarding is required.', 400, 'ONBOARDING_REQUIRED');
  }

  const gig = await prisma.gig.findUnique({ where: { id: gigId } });
  if (!gig) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have access to view applicants for this collab.", 403, 'FORBIDDEN');
  }

  const { cursor, limit } = parsePagination(filters, 10);

  const applications = await prisma.application.findMany({
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    where: { gigId },
    orderBy: { createdAt: 'desc' },
    include: {
      influencer: {
        select: {
          id: true,
          name: true,
          instagramHandle: true,
          niche: true,
          bio: true,
          profileImageUrl: true,
          followerCount: true,
          user: {
            select: {
              lastActiveAt: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.application.count({ where: { gigId } });
  const paginated = paginateResults(applications, limit);
  paginated.pagination.total = total;

  return paginated;
};

/**
 * Get current creator's application history.
 */
const getMyApplications = async (userId, filters) => {
  const influencer = await getInfluencerByUserId(userId);
  const { cursor, limit } = parsePagination(filters, 10);

  const applications = await prisma.application.findMany({
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    where: { influencerId: influencer.id },
    orderBy: { createdAt: 'desc' },
    include: {
      gig: {
        select: {
          id: true,
          title: true,
          budgetMin: true,
          budgetMax: true,
          deadline: true,
          category: true,
          status: true,
          brand: {
            select: {
              businessName: true,
              logoUrl: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.application.count({ where: { influencerId: influencer.id } });
  const paginated = paginateResults(applications, limit);
  paginated.pagination.total = total;

  return paginated;
};

/**
 * Update Application Status (Accept / Reject) - Brand Owner only.
 */
const updateStatus = async (applicationId, userId, status) => {
  const brand = await prisma.brand.findUnique({ where: { userId } });
  if (!brand) {
    throw new AppError('Brand onboarding is required.', 400, 'ONBOARDING_REQUIRED');
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      gig: {
        include: {
          brand: true,
        },
      },
      influencer: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!application) {
    throw new AppError('Application not found.', 404, 'NOT_FOUND');
  }

  if (application.gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to update this application.", 403, 'FORBIDDEN');
  }

  if (application.status !== 'PENDING') {
    throw new AppError('This application has already been processed.', 400, 'BAD_REQUEST');
  }

  const updatedApplication = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: applicationId },
      data: { status },
    });

    const isAccepted = status === 'ACCEPTED';
    const notifType = isAccepted ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED';
    const notifTitle = isAccepted ? "You're in! 🎊" : 'Update on your application';
    const notifMessage = isAccepted
      ? `Congratulations! ${brand.businessName} accepted your application for "${application.gig.title}"`
      : `Bummer! ${brand.businessName} reviewed your application for "${application.gig.title}"`;

    // Create Notification for the Influencer
    await tx.notification.create({
      data: {
        userId: application.influencer.user.id,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        metadata: JSON.stringify({
          gigId: application.gigId,
          applicationId,
          brandId: brand.id,
        }),
      },
    });

    return updated;
  });

  return updatedApplication;
};

module.exports = {
  apply,
  getGigApplications,
  getMyApplications,
  updateStatus,
};
