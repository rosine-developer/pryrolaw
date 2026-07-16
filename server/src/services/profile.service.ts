import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';

export const ProfileService = {
  async get(userId: string) {
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
    if (!profile) throw AppError.notFound('Profile not found.');
    return profile;
  },

  async upsert(userId: string, data: {
    fullName?: string;
    firmName?: string | null;
    barNumber?: string | null;
    primaryJurisdiction?: string | null;
    avatarUrl?: string | null;
  }) {
    return prisma.lawyerProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, fullName: data.fullName ?? '', ...data },
    });
  },
};
