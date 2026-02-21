import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Avatar } from '@/components/ui/Avatar';
import { getProgressToNextLevel } from '@skillshare-circles/shared';

function getProgressToNextLevelFn(xp: number): number {
  const getLevelFromXp = (x: number) => Math.floor(Math.sqrt(x / 100)) + 1;
  const getXpForLevel = (l: number) => Math.pow(l - 1, 2) * 100;
  const currentLevel = getLevelFromXp(xp);
  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  return Math.floor(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100);
}

export function Header() {
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  if (!user) return null;

  const progress = getProgressToNextLevelFn(user.xp);

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 lg:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4 pl-12 lg:pl-0">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary-600 text-white px-3 py-1 rounded text-sm">
          Skip to main content
        </a>
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Level {user.level}</span>
              <span className="text-xs text-primary-400 font-medium">{user.xp} XP</span>
              {user.streak > 0 && (
                <span className="text-xs text-orange-400 flex items-center gap-1" aria-label={`${user.streak} day streak`}>
                  🔥 {user.streak}
                </span>
              )}
            </div>
            <div className="w-32 h-1.5 bg-slate-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="XP progress to next level">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/notifications"
          className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold"
              aria-hidden="true"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label={`Profile: ${user.displayName}`}
        >
          <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
          <span className="hidden sm:block text-sm text-slate-300 font-medium">{user.displayName}</span>
        </Link>
      </div>
    </header>
  );
}
