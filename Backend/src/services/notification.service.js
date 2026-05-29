const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { parsePagination, paginateResults } = require('../utils/pagination');

/**
 * Create a new notification.
 */
const create = async (data) => {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  });
};

/**
 * Fetch a user's notifications.
 */
const getUserNotifications = async (userId, filters) => {
  const { cursor, limit } = parsePagination(filters, 20);

  const notifications = await prisma.notification.findMany({
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const parsedNotifications = notifications.map((n) => ({
    ...n,
    metadata: n.metadata ? JSON.parse(n.metadata) : null,
  }));

  return paginateResults(parsedNotifications, limit);
};

/**
 * Mark a single notification as read.
 */
const markAsRead = async (id, userId) => {
  const notification = await prisma.notification.findUnique({ where: { id } });

  if (!notification) {
    throw new AppError('Notification not found.', 404, 'NOT_FOUND');
  }

  if (notification.userId !== userId) {
    throw new AppError("You don't have access to this notification.", 403, 'FORBIDDEN');
  }

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
};

/**
 * Mark all notifications as read for a user.
 */
const markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: { isRead: true },
  });
};

/**
 * Get count of unread notifications.
 */
const getUnreadCount = async (userId) => {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
  return { count };
};

module.exports = {
  create,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
