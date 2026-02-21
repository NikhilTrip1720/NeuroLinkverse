import { useQuery } from '@tanstack/react-query';
import { Trophy, TrendingUp, Flame } from 'lucide-react';
import api from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  rank: number;
  user: { id: string; username: string; displayName: string; avatarUrl?: string | null; level: number };
  xp: number;
  level: number;
  streak: number;
}

export function LeaderboardPage() {
  const { user } = useAuthStore();
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await api.get<{ data: LeaderboardEntry[] }>('/users/leaderboard');
      return res.data.data;
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-400" aria-hidden="true" />
          Leaderboard
        </h1>
        <p className="text-slate-400 mt-1">Top learners this month</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="space-y-2">
          {leaderboard?.map((entry) => (
            <div
              key={entry.user.id}
              className={cn(
                'card p-4 flex items-center gap-4',
                entry.user.id === user?.id && 'border-primary-600 bg-primary-900/20',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                entry.rank === 1 ? 'bg-yellow-500 text-black' :
                entry.rank === 2 ? 'bg-slate-400 text-black' :
                entry.rank === 3 ? 'bg-amber-600 text-white' :
                'bg-slate-800 text-slate-400',
              )}>
                {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : entry.rank}
              </div>
              <Avatar src={entry.user.avatarUrl} name={entry.user.displayName} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-100 truncate">
                  {entry.user.displayName}
                  {entry.user.id === user?.id && <span className="ml-2 text-xs text-primary-400">(You)</span>}
                </p>
                <p className="text-sm text-slate-400">@{entry.user.username}</p>
              </div>
              <div className="flex items-center gap-4 text-sm flex-shrink-0">
                <span className="flex items-center gap-1 text-green-400">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  Lvl {entry.level}
                </span>
                {entry.streak > 0 && (
                  <span className="flex items-center gap-1 text-orange-400">
                    <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                    {entry.streak}
                  </span>
                )}
                <span className="font-semibold text-primary-400">{entry.xp.toLocaleString()} XP</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
