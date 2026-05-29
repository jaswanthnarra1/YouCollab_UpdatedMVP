const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');

/**
 * Onboard a Brand profile.
 */
const onboardBrand = async (userId, data) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }
  
  if (user.role !== 'BRAND') {
    throw new AppError('Only brands can onboard here.', 403, 'FORBIDDEN');
  }

  if (user.isOnboarded) {
    throw new AppError('You have already completed onboarding!', 400, 'BAD_REQUEST');
  }

  // Create brand record & update user
  const result = await prisma.$transaction(async (tx) => {
    const brand = await tx.brand.create({
      data: {
        userId,
        businessName: data.businessName,
        category: data.category,
        location: data.location || 'Pune',
        bio: data.bio,
        logoUrl: data.logoUrl || null,
        website: data.website || null,
      },
    });

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        isOnboarded: true,
        avatarUrl: data.logoUrl || null,
      },
      include: {
        brand: true,
      },
    });

    return updatedUser;
  });

  return {
    id: result.id,
    email: result.email,
    role: result.role,
    avatarUrl: result.avatarUrl,
    isOnboarded: result.isOnboarded,
    brand: result.brand,
  };
};

/**
 * Onboard an Influencer profile.
 */
const onboardInfluencer = async (userId, data) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  if (user.role !== 'INFLUENCER') {
    throw new AppError('Only creators can onboard here.', 403, 'FORBIDDEN');
  }

  if (user.isOnboarded) {
    throw new AppError('You have already completed onboarding!', 400, 'BAD_REQUEST');
  }

  // Create influencer record & update user
  const result = await prisma.$transaction(async (tx) => {
    const influencer = await tx.influencer.create({
      data: {
        userId,
        name: data.name,
        instagramHandle: data.instagramHandle,
        niche: data.niche,
        bio: data.bio,
        profileImageUrl: data.profileImageUrl || null,
        followerCount: data.followerCount || 0,
      },
    });

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        isOnboarded: true,
        avatarUrl: data.profileImageUrl || null,
      },
      include: {
        influencer: true,
      },
    });

    return updatedUser;
  });

  return {
    id: result.id,
    email: result.email,
    role: result.role,
    avatarUrl: result.avatarUrl,
    isOnboarded: result.isOnboarded,
    influencer: result.influencer,
  };
};

module.exports = {
  onboardBrand,
  onboardInfluencer,
};
