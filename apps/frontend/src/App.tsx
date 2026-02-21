import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCurrentUser } from '@/hooks/useAuth';
import { getSocket } from '@/lib/socket';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Notification } from '@skillshare-circles/shared';
import toast from 'react-hot-toast';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CirclesPage = lazy(() => import('./pages/CirclesPage').then((m) => ({ default: m.CirclesPage })));
const CircleDetailPage = lazy(() => import('./pages/CircleDetailPage').then((m) => ({ default: m.CircleDetailPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const AIPlannerPage = lazy(() => import('./pages/AIPlannerPage').then((m) => ({ default: m.AIPlannerPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppInitializer() {
  const { isAuthenticated } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    socket.on('notification:new', (notification: Notification) => {
      addNotification(notification);
      toast(notification.message, { icon: '🔔' });
    });

    return () => {
      socket.off('notification:new');
    };
  }, [isAuthenticated, addNotification]);

  if (isLoading) return <FullPageSpinner />;
  return null;
}

export default function App() {
  return (
    <>
      <AppInitializer />
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/circles" element={<CirclesPage />} />
            <Route path="/circles/:circleId" element={<CircleDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/ai-planner" element={<AIPlannerPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
