import { Link } from 'react-router-dom';
import { Users, CheckSquare, TrendingUp, Plus, BookOpen, Sparkles } from 'lucide-react';
import { useMyCircles } from '@/hooks/useCircles';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { formatRelativeTime, truncate } from '@/lib/utils';

export function DashboardPage() {
  const { user } = useAuthStore();
  const { data: circles, isLoading } = useMyCircles();

  const totalMembers = circles?.reduce((sum, c) => sum + ((c as { _count?: { members: number } })._count?.members ?? 0), 0) ?? 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Welcome back, <span className="text-gradient">{user?.displayName}</span>! 👋
          </h1>
          <p className="text-slate-400 mt-1">Here's what's happening in your circles</p>
        </div>
        <div className="flex gap-2">
          <Link to="/ai-planner">
            <Button variant="secondary" leftIcon={<Sparkles className="h-4 w-4" />}>
              AI Planner
            </Button>
          </Link>
          <Link to="/circles">
            <Button leftIcon={<Plus className="h-4 w-4" />}>New Circle</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Circles', value: circles?.length || 0, icon: Users, color: 'text-primary-400' },
          { label: 'Circle Members', value: totalMembers, icon: BookOpen, color: 'text-purple-400' },
          { label: 'Level', value: user?.level || 1, icon: TrendingUp, color: 'text-green-400' },
          { label: 'XP Points', value: user?.xp || 0, icon: CheckSquare, color: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-slate-100">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100">My Circles</h2>
          <Link to="/circles" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : !circles?.length ? (
          <div className="card p-12 text-center">
            <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No circles yet</h3>
            <p className="text-slate-500 mb-4">Join or create a study circle to get started</p>
            <Link to="/circles">
              <Button>Explore Circles</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {circles.map((circle) => {
              const c = circle as typeof circle & { _count?: { members: number }; messages?: Array<{ content: string; createdAt: string }>; role?: string };
              return (
                <Link key={c.id} to={`/circles/${c.id}`} className="card-hover p-5 block group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-100 group-hover:text-primary-300 transition-colors truncate">
                        {c.name}
                      </h3>
                      <p className="text-xs text-primary-400 mt-0.5">{c.subject}</p>
                    </div>
                    {c.role === 'ADMIN' && (
                      <span className="badge-primary badge ml-2 flex-shrink-0">Admin</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                    {truncate(c.description, 100)}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{c._count?.members || 0} members</span>
                    {c.messages?.[0] && (
                      <span>{formatRelativeTime(c.messages[0].createdAt)}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
