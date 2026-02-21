export const XP_REWARDS = {
  SEND_MESSAGE: 5,
  COMPLETE_TASK: 50,
  CREATE_TASK: 10,
  UPLOAD_RESOURCE: 25,
  JOIN_CIRCLE: 20,
  CREATE_CIRCLE: 50,
  DAILY_LOGIN: 10,
  GENERATE_STUDY_PLAN: 30,
} as const;

export function getLevelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function getXpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

export function getXpForNextLevel(level: number): number {
  return getXpForLevel(level + 1);
}

export function getProgressToNextLevel(xp: number): number {
  const currentLevel = getLevelFromXp(xp);
  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = getXpForNextLevel(currentLevel);
  return Math.floor(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100);
}
