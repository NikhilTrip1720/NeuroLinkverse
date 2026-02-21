import { NavLink } from 'react-router-dom';
import {
  Home, Users, Trophy, BookOpen, Bell, User, LogOut, Sparkles, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/circles', icon: Users, label: 'Circles' },
  { to: '/ai-planner', icon: Sparkles, label: 'AI Planner' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    disconnectSocket();
    logout();
    window.location.href = '/login';
  };

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-slate-900 border border-slate-700 text-slate-300"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        aria-controls="sidebar"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        id="sidebar"
        className={cn(
          'fixed lg:relative top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-40',
          'transition-transform duration-300 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3 p-4 border-b border-slate-800">
          <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center" aria-hidden="true">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-100">Skillshare Circles</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-900/50 text-primary-300 border border-primary-700/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                )
              }
              onClick={() => setIsOpen(false)}
              aria-current={undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {label}
              {label === 'Profile' && unreadCount > 0 && (
                <span className="ml-auto badge-red badge text-xs" aria-label={`${unreadCount} unread notifications`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {user && (
          <div className="border-t border-slate-800 p-3 space-y-2">
            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-900/50 text-primary-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                )
              }
              onClick={() => setIsOpen(false)}
            >
              <Bell className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-auto badge-red badge" aria-label={`${unreadCount} unread`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
            <div className="flex items-center gap-2 px-3 py-2">
              <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-100 truncate">{user.displayName}</p>
                <p className="text-xs text-slate-500 truncate">Lvl {user.level}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
