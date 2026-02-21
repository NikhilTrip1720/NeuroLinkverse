import { prisma } from '../config/prisma';
import { getLevelFromXp, XP_REWARDS } from '../utils/xp';
import { logger } from '../config/logger';

type XpAction = keyof typeof XP_REWARDS;

export async function awardXp(userId: string, action: XpAction): Promise<void> {
  try {
    const xpGained = XP_REWARDS[action];

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });

    if (!user) return;

    const newXp = user.xp + xpGained;
    const newLevel = getLevelFromXp(newXp);
    const leveledUp = newLevel > user.level;

    await prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel },
    });

    if (leveledUp) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'LEVEL_UP',
          title: '🎉 Level Up!',
          message: `Congratulations! You've reached level ${newLevel}!`,
        },
      });
    }

    await checkAndAwardAchievements(userId, action);
  } catch (error) {
    logger.error('Failed to award XP', { error, userId, action });
  }
}

async function checkAndAwardAchievements(userId: string, action: XpAction): Promise<void> {
  const achievementConditionMap: Partial<Record<XpAction, string>> = {
    CREATE_CIRCLE: 'CREATE_CIRCLE',
    SEND_MESSAGE: 'FIRST_MESSAGE',
    UPLOAD_RESOURCE: 'KNOWLEDGE_SHARER',
    JOIN_CIRCLE: 'SOCIAL_BUTTERFLY',
  };

  const condition = achievementConditionMap[action];
  if (!condition) return;

  const achievement = await prisma.achievement.findFirst({
    where: { condition },
  });

  if (!achievement) return;

  const alreadyEarned = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
  });

  if (alreadyEarned) return;

  await prisma.userAchievement.create({
    data: { userId, achievementId: achievement.id },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: achievement.xpReward } },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: 'ACHIEVEMENT',
      title: `🏆 Achievement Unlocked!`,
      message: `You earned "${achievement.name}" - ${achievement.description}`,
    },
  });
}

export async function updateStreak(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastActiveAt: true, streak: true },
    });

    if (!user) return;

    const now = new Date();
    const lastActive = user.lastActiveAt;
    const hoursDiff = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

    let newStreak = user.streak;
    if (hoursDiff >= 20 && hoursDiff < 48) {
      newStreak = user.streak + 1;
    } else if (hoursDiff >= 48) {
      newStreak = 0;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: now, streak: newStreak },
    });

    if (newStreak === 7) {
      const achievement = await prisma.achievement.findFirst({
        where: { condition: 'STREAK_7' },
      });
      if (achievement) {
        const alreadyEarned = await prisma.userAchievement.findUnique({
          where: { userId_achievementId: { userId, achievementId: achievement.id } },
        });
        if (!alreadyEarned) {
          await prisma.userAchievement.create({
            data: { userId, achievementId: achievement.id },
          });
        }
      }
    }
  } catch (error) {
    logger.error('Failed to update streak', { error, userId });
  }
}
