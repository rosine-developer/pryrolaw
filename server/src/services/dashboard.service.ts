import { prisma } from '../lib/prisma';

export const DashboardService = {
  async getSummary(userId: string) {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalCases,
      openCases,
      urgentCases,
      pendingTasks,
      overdueTasks,
      upcomingEvents,
      recentDocuments,
      recentCases,
    ] = await prisma.$transaction([
      prisma.case.count({ where: { userId } }),
      prisma.case.count({ where: { userId, status: 'OPEN' } }),
      prisma.case.count({ where: { userId, priority: 'URGENT', status: { not: 'ARCHIVED' } } }),
      prisma.task.count({ where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
      prisma.task.count({
        where: { userId, status: { not: 'DONE' }, dueDate: { lt: now } },
      }),
      prisma.calendarEvent.findMany({
        where: { userId, startTime: { gte: now, lte: sevenDays } },
        include: { case: true },
        orderBy: { startTime: 'asc' },
        take: 5,
      }),
      prisma.document.findMany({
        where: { userId },
        include: { case: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.case.findMany({
        where: { userId, status: 'OPEN' },
        include: { client: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      stats: {
        totalCases,
        openCases,
        urgentCases,
        pendingTasks,
        overdueTasks,
      },
      upcomingEvents,
      recentDocuments,
      recentCases,
    };
  },
};
