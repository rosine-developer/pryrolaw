import { TaskPriority, TaskStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';

export const TasksService = {
  async list(userId: string, filters: {
    caseId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    page?: number;
    limit?: number;
  } = {}) {
    const { caseId, status, priority, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;
    const where: Prisma.TaskWhereInput = { userId };
    if (caseId) where.caseId = caseId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        include: { case: true },
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);
    return { tasks, total, page, limit };
  },

  async getById(id: string, userId: string) {
    const task = await prisma.task.findFirst({
      where: { id, userId },
      include: { case: true },
    });
    if (!task) throw AppError.notFound('Task not found.');
    return task;
  },

  async create(userId: string, data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: Date;
    assignedTo?: string;
    caseId?: string;
  }) {
    if (data.caseId) {
      const c = await prisma.case.findFirst({ where: { id: data.caseId, userId } });
      if (!c) throw AppError.badRequest('Case not found.');
    }
    return prisma.task.create({
      data: { ...data, userId },
      include: { case: true },
    });
  },

  async update(id: string, userId: string, data: Partial<{
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: Date | null;
    assignedTo: string | null;
    caseId: string | null;
  }>) {
    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) throw AppError.notFound('Task not found.');
    return prisma.task.update({ where: { id }, data, include: { case: true } });
  },

  async delete(id: string, userId: string) {
    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) throw AppError.notFound('Task not found.');
    await prisma.task.delete({ where: { id } });
  },
};
