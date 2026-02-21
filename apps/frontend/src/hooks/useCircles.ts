import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Circle, Task, Resource, Message } from '@skillshare-circles/shared';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';

export function useMyCircles() {
  return useQuery({
    queryKey: ['circles', 'my'],
    queryFn: async () => {
      const res = await api.get<{ data: Circle[] }>('/circles/my');
      return res.data.data;
    },
  });
}

export function useDiscoverCircles(search?: string, subject?: string) {
  return useQuery({
    queryKey: ['circles', 'discover', search, subject],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (subject) params.set('subject', subject);
      const res = await api.get(`/circles?${params}`);
      return res.data.data;
    },
  });
}

export function useCircle(circleId: string) {
  return useQuery({
    queryKey: ['circles', circleId],
    queryFn: async () => {
      const res = await api.get<{ data: Circle & { members: unknown[]; isMember: boolean } }>(`/circles/${circleId}`);
      return res.data.data;
    },
    enabled: !!circleId,
  });
}

export function useCreateCircle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description: string; subject: string; isPrivate: boolean; maxMembers: number }) => {
      const res = await api.post('/circles', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circles'] });
      toast.success('Circle created!');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useJoinCircle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ circleId, inviteCode }: { circleId: string; inviteCode?: string }) => {
      const res = await api.post(`/circles/${circleId}/join`, { inviteCode });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['circles'] });
      queryClient.invalidateQueries({ queryKey: ['circles', variables.circleId] });
      toast.success('Joined circle!');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useLeaveCircle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (circleId: string) => {
      await api.post(`/circles/${circleId}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circles'] });
      toast.success('Left circle');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useTasks(circleId: string) {
  return useQuery({
    queryKey: ['tasks', circleId],
    queryFn: async () => {
      const res = await api.get<{ data: Task[] }>(`/circles/${circleId}/tasks`);
      return res.data.data;
    },
    enabled: !!circleId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ circleId, ...data }: { circleId: string; title: string; description?: string; priority?: string; dueDate?: string; assigneeId?: string }) => {
      const res = await api.post(`/circles/${circleId}/tasks`, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.circleId] });
      toast.success('Task created!');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ circleId, taskId, ...data }: { circleId: string; taskId: string } & Partial<Task>) => {
      const res = await api.patch(`/circles/${circleId}/tasks/${taskId}`, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.circleId] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useResources(circleId: string) {
  return useQuery({
    queryKey: ['resources', circleId],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Resource[] } }>(`/circles/${circleId}/resources`);
      return res.data.data.items;
    },
    enabled: !!circleId,
  });
}

export function useMessages(circleId: string) {
  return useInfiniteQuery({
    queryKey: ['messages', circleId],
    queryFn: async ({ pageParam }) => {
      const params = pageParam ? `?before=${pageParam}` : '';
      const res = await api.get<{ data: { items: Message[]; hasMore: boolean } }>(`/circles/${circleId}/messages${params}`);
      return res.data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.items.length === 0) return undefined;
      return lastPage.items[0]?.createdAt as string | undefined;
    },
    enabled: !!circleId,
  });
}
