import { CasePriority, CaseStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';

export interface CaseFilters {
  status?: CaseStatus;
  priority?: CasePriority;
  caseType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const CasesService = {
  async list(userId: string, filters: CaseFilters = {}) {
    const { status, priority, caseType, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.CaseWhereInput = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (caseType) where.caseType = caseType;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { caseNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [cases, total] = await prisma.$transaction([
      prisma.case.findMany({
        where,
        include: { client: true },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.case.count({ where }),
    ]);

    return { cases, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async getById(id: string, userId: string) {
    const c = await prisma.case.findFirst({
      where: { id, userId },
      include: {
        client: true,
        documents: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: { dueDate: 'asc' } },
        events: { orderBy: { startTime: 'asc' } },
        notes: { orderBy: { createdAt: 'desc' } },
        timeline: { orderBy: { eventDate: 'asc' } },
        conversations: { orderBy: { updatedAt: 'desc' } },
      },
    });
    if (!c) throw AppError.notFound('Case not found.');
    return c;
  },

  async create(userId: string, data: {
    title: string;
    caseNumber: string;
    caseType: string;
    jurisdiction?: string;
    description?: string;
    status?: CaseStatus;
    priority?: CasePriority;
    opposingParty?: string;
    assignedLawyer?: string;
    clientId?: string;
  }) {
    // Verify client belongs to the same user if provided
    if (data.clientId) {
      const client = await prisma.client.findFirst({ where: { id: data.clientId, userId } });
      if (!client) throw AppError.badRequest('Client not found.');
    }

    return prisma.case.create({
      data: { ...data, userId },
      include: { client: true },
    });
  },

  async update(id: string, userId: string, data: Partial<{
    title: string;
    caseNumber: string;
    caseType: string;
    jurisdiction: string;
    description: string;
    status: CaseStatus;
    priority: CasePriority;
    opposingParty: string;
    assignedLawyer: string;
    clientId: string | null;
  }>) {
    const existing = await prisma.case.findFirst({ where: { id, userId } });
    if (!existing) throw AppError.notFound('Case not found.');

    if (data.clientId) {
      const client = await prisma.client.findFirst({ where: { id: data.clientId, userId } });
      if (!client) throw AppError.badRequest('Client not found.');
    }

    return prisma.case.update({
      where: { id },
      data,
      include: { client: true },
    });
  },

  async delete(id: string, userId: string) {
    const existing = await prisma.case.findFirst({ where: { id, userId } });
    if (!existing) throw AppError.notFound('Case not found.');
    await prisma.case.delete({ where: { id } });
  },

  // ── Notes ──────────────────────────────────────────────────────────────────

  async getNotes(caseId: string, userId: string) {
    await CasesService._assertOwner(caseId, userId);
    return prisma.caseNote.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createNote(caseId: string, userId: string, content: string) {
    await CasesService._assertOwner(caseId, userId);
    return prisma.caseNote.create({ data: { caseId, userId, content } });
  },

  async deleteNote(noteId: string, userId: string) {
    const note = await prisma.caseNote.findFirst({ where: { id: noteId, userId } });
    if (!note) throw AppError.notFound('Note not found.');
    await prisma.caseNote.delete({ where: { id: noteId } });
  },

  // ── Timeline ───────────────────────────────────────────────────────────────

  async getTimeline(caseId: string, userId: string) {
    await CasesService._assertOwner(caseId, userId);
    return prisma.caseTimeline.findMany({
      where: { caseId },
      orderBy: { eventDate: 'asc' },
    });
  },

  async createTimelineEvent(caseId: string, userId: string, data: {
    eventType: string;
    title: string;
    description?: string;
    eventDate: Date;
  }) {
    await CasesService._assertOwner(caseId, userId);
    return prisma.caseTimeline.create({ data: { caseId, userId, ...data } });
  },

  async deleteTimelineEvent(eventId: string, userId: string) {
    const event = await prisma.caseTimeline.findFirst({ where: { id: eventId, userId } });
    if (!event) throw AppError.notFound('Timeline event not found.');
    await prisma.caseTimeline.delete({ where: { id: eventId } });
  },

  async _assertOwner(caseId: string, userId: string) {
    const c = await prisma.case.findFirst({ where: { id: caseId, userId } });
    if (!c) throw AppError.notFound('Case not found.');
    return c;
  },
};
