import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import type { User } from '@skillshare-circles/shared';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { getErrorMessage } from '@/lib/utils';
import toast from 'react-hot-toast';

export function useCurrentUser() {
  const { setUser, setLoading } = useAuthStore();

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get<{ data: User }>('/auth/me');
      setUser(res.data.data);
      connectSocket();
      return res.data.data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
    meta: {
      onError: () => {
        setLoading(false);
      },
    },
  });
}

export function useLogin() {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.post<{ data: { user: User } }>('/auth/login', data);
      return res.data.data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      connectSocket();
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: { email: string; username: string; displayName: string; password: string }) => {
      const res = await api.post('/auth/register', data);
      return res.data;
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSettled: () => {
      disconnectSocket();
      logout();
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}
