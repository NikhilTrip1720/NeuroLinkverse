import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';

export function ProfilePage() {
  useParams();
  const { user } = useAuthStore();
  const displayUser = user;

  if (!displayUser) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="card p-8 flex flex-col items-center text-center gap-4">
        <Avatar src={displayUser.avatarUrl} name={displayUser.displayName} size="xl" showBorder />
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{displayUser.displayName}</h1>
          <p className="text-slate-400">@{displayUser.username}</p>
          {displayUser.bio && <p className="text-slate-300 mt-2 max-w-md">{displayUser.bio}</p>}
        </div>
        <div className="flex gap-8">
          <div className="text-center"><p className="text-2xl font-bold text-primary-400">{displayUser.level}</p><p className="text-xs text-slate-400">Level</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-primary-400">{displayUser.xp.toLocaleString()}</p><p className="text-xs text-slate-400">XP</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-orange-400">{displayUser.streak}</p><p className="text-xs text-slate-400">Streak</p></div>
        </div>
      </div>
    </div>
  );
}
