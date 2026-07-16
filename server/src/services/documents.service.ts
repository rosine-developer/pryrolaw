import { DocumentCategory, DocumentStatus, Prisma } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';

export const DocumentsService = {
  async list(userId: string, filters: {
    caseId?: string;
    category?: DocumentCategory;
    status?: DocumentStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { caseId, category, status, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = { userId };
    if (caseId) where.caseId = caseId;
    if (category) where.category = category;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await prisma.$transaction([
      prisma.document.findMany({
        where,
        include: { case: true },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    return { documents, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async getById(id: string, userId: string) {
    const doc = await prisma.document.findFirst({
      where: { id, userId },
      include: { case: true, versions: { orderBy: { versionNumber: 'desc' } } },
    });
    if (!doc) throw AppError.notFound('Document not found.');
    return doc;
  },

  async create(userId: string, data: {
    title: string;
    category?: DocumentCategory;
    fileType: string;
    fileSize?: number;
    storagePath?: string;
    description?: string;
    status?: DocumentStatus;
    tags?: string[];
    caseId?: string;
  }) {
    if (data.caseId) {
      const c = await prisma.case.findFirst({ where: { id: data.caseId, userId } });
      if (!c) throw AppError.badRequest('Case not found.');
    }

    return prisma.document.create({ data: { ...data, userId } });
  },

  async update(id: string, userId: string, data: Partial<{
    title: string;
    category: DocumentCategory;
    description: string;
    status: DocumentStatus;
    tags: string[];
    caseId: string | null;
  }>) {
    const existing = await prisma.document.findFirst({ where: { id, userId } });
    if (!existing) throw AppError.notFound('Document not found.');
    return prisma.document.update({ where: { id }, data });
  },

  async delete(id: string, userId: string) {
    const existing = await prisma.document.findFirst({ where: { id, userId } });
    if (!existing) throw AppError.notFound('Document not found.');

    // Remove file from disk if it exists
    if (existing.storagePath) {
      const fullPath = path.join(process.cwd(), existing.storagePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await prisma.document.delete({ where: { id } });
  },

  async addVersion(documentId: string, userId: string, data: {
    storagePath?: string;
    fileSize?: number;
    changeNote?: string;
  }) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } });
    if (!doc) throw AppError.notFound('Document not found.');

    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
    });

    return prisma.documentVersion.create({
      data: {
        documentId,
        userId,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        ...data,
      },
    });
  },
};
