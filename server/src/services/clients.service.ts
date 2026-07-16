import { ClientType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';

export const ClientsService = {
  async list(userId: string, search?: string) {
    const where: Prisma.ClientWhereInput = { userId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }
    return prisma.client.findMany({ where, orderBy: { name: 'asc' } });
  },

  async getById(id: string, userId: string) {
    const client = await prisma.client.findFirst({
      where: { id, userId },
      include: { cases: { orderBy: { updatedAt: 'desc' } } },
    });
    if (!client) throw AppError.notFound('Client not found.');
    return client;
  },

  async create(userId: string, data: {
    name: string;
    type?: ClientType;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
    notes?: string;
  }) {
    return prisma.client.create({ data: { ...data, userId } });
  },

  async update(id: string, userId: string, data: Partial<{
    name: string;
    type: ClientType;
    email: string;
    phone: string;
    address: string;
    company: string;
    notes: string;
  }>) {
    const existing = await prisma.client.findFirst({ where: { id, userId } });
    if (!existing) throw AppError.notFound('Client not found.');
    return prisma.client.update({ where: { id }, data });
  },

  async delete(id: string, userId: string) {
    const existing = await prisma.client.findFirst({ where: { id, userId } });
    if (!existing) throw AppError.notFound('Client not found.');
    await prisma.client.delete({ where: { id } });
  },
};
