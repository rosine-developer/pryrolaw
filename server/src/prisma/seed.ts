import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@legalworkspace.com' },
    update: {},
    create: {
      email: 'demo@legalworkspace.com',
      passwordHash,
      profile: {
        create: {
          fullName: 'Alex Morgan',
          firmName: 'Morgan & Associates',
          barNumber: 'BAR-2024-001',
          primaryJurisdiction: 'United States — New York',
        },
      },
    },
  });

  console.log(`Demo user: ${user.email} / password123`);

  const client = await prisma.client.upsert({
    where: { id: 'seed-client-1' },
    update: {},
    create: {
      id: 'seed-client-1',
      userId: user.id,
      name: 'Acme Corporation',
      type: 'ORGANIZATION',
      email: 'legal@acme.com',
      company: 'Acme Corporation',
    },
  });

  const demoCase = await prisma.case.upsert({
    where: { id: 'seed-case-1' },
    update: {},
    create: {
      id: 'seed-case-1',
      userId: user.id,
      clientId: client.id,
      title: 'Acme Corp vs. NovaTech — IP Dispute',
      caseNumber: 'IPL-2024-001',
      caseType: 'Intellectual Property',
      jurisdiction: 'United States — New York',
      description: 'Patent infringement claim related to proprietary manufacturing process.',
      status: 'OPEN',
      priority: 'HIGH',
      opposingParty: 'NovaTech Industries',
    },
  });

  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'seed-task-1',
        userId: user.id,
        caseId: demoCase.id,
        title: 'Review discovery documents',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'seed-task-2',
        userId: user.id,
        caseId: demoCase.id,
        title: 'Prepare motion for summary judgment',
        priority: 'URGENT',
        status: 'TODO',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.calendarEvent.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'seed-event-1',
        userId: user.id,
        caseId: demoCase.id,
        title: 'Pre-trial hearing',
        eventType: 'HEARING',
        startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: 'Southern District Court, NYC',
        reminderMinutes: 60,
      },
    ],
  });

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
