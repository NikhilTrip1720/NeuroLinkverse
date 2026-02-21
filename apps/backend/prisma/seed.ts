import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const achievements = [
    {
      id: 'ach_first_circle',
      name: 'Circle Founder',
      description: 'Create your first study circle',
      icon: '🏛️',
      xpReward: 100,
      condition: 'CREATE_CIRCLE',
    },
    {
      id: 'ach_first_message',
      name: 'First Words',
      description: 'Send your first message',
      icon: '💬',
      xpReward: 25,
      condition: 'FIRST_MESSAGE',
    },
    {
      id: 'ach_task_master',
      name: 'Task Master',
      description: 'Complete 10 tasks',
      icon: '✅',
      xpReward: 200,
      condition: 'COMPLETE_10_TASKS',
    },
    {
      id: 'ach_week_streak',
      name: 'On Fire',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      xpReward: 150,
      condition: 'STREAK_7',
    },
    {
      id: 'ach_social_butterfly',
      name: 'Social Butterfly',
      description: 'Join 5 study circles',
      icon: '🦋',
      xpReward: 100,
      condition: 'JOIN_5_CIRCLES',
    },
    {
      id: 'ach_knowledge_sharer',
      name: 'Knowledge Sharer',
      description: 'Upload 10 resources',
      icon: '📚',
      xpReward: 150,
      condition: 'UPLOAD_10_RESOURCES',
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { id: achievement.id },
      update: {},
      create: achievement,
    });
  }

  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@skillshare-circles.com' },
    update: {},
    create: {
      email: 'admin@skillshare-circles.com',
      username: 'admin',
      displayName: 'Admin User',
      passwordHash: adminPassword,
      isEmailVerified: true,
      level: 10,
      xp: 5000,
      streak: 30,
    },
  });

  console.log('Admin user:', admin.email);
  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
