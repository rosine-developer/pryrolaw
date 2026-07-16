import { EventType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';

export const CalendarService = {
  async list(userId: string, filters: {
    caseId?: string;
    eventType?: EventType;
    from?: Date;
    to?: Date;
  } = {}) {
    const where: Prisma.CalendarEventWhereInput = { userId };
    if (filters.caseId) where.caseId = filters.caseId;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.from || filters.to) {
      where.startTime = {};
      if (filters.from) where.startTime.gte = filters.from;
      if (filters.to) where.startTime.lte = filters.to;
    }

    return prisma.calendarEvent.findMany({
      where,
      include: { case: true },
      orderBy: { startTime: 'asc' },
    });
  },

  async getById(id: string, userId: string) {
    const event = await prisma.calendarEvent.findFirst({
      where: { id, userId },
      include: { case: true },
    });
    if (!event) throw AppError.notFound('Event not found.');
    return event;
  },

  async create(userId: string, data: {
    title: string;
    description?: string;
    eventType: EventType;
    location?: string;
    startTime: Date;
    endTime: Date;
    reminderMinutes?: number;
    caseId?: string;
  }) {
    if (data.startTime >= data.endTime) {
      throw AppError.badRequest('End time must be after start time.');
    }
    if (data.caseId) {
      const c = await prisma.case.findFirst({ where: { id: data.caseId, userId } });
      if (!c) throw AppError.badRequest('Case not found.');
    }
    return prisma.calendarEvent.create({
      data: { ...data, userId },
      include: { case: true },
    });
  },

  async update(id: string, userId: string, data: Partial<{
    title: string;
    description: string;
    eventType: EventType;
    location: string;
    startTime: Date;
    endTime: Date;
    reminderMinutes: number;
    caseId: string | null;
  }>) {
    const existing = await prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!existing) throw AppError.notFound('Event not found.');
    return prisma.calendarEvent.update({ where: { id }, data, include: { case: true } });
  },

  async delete(id: string, userId: string) {
    const existing = await prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!existing) throw AppError.notFound('Event not found.');
    await prisma.calendarEvent.delete({ where: { id } });
  },

  async getUpcoming(userId: string, days = 7) {
    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return prisma.calendarEvent.findMany({
      where: { userId, startTime: { gte: now, lte: until } },
      include: { case: true },
      orderBy: { startTime: 'asc' },
    });
  },
};
