import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { MessageSquare, CheckSquare, FileText, Video, Users, Send, Plus, X } from 'lucide-react';
import { useCircle, useTasks, useMessages, useCreateTask, useUpdateTask, useResources } from '@/hooks/useCircles';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatMessageTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { getSocket, joinCircle, leaveCircle, sendMessage, startTyping, stopTyping } from '@/lib/socket';
import type { Message, Task } from '@skillshare-circles/shared';

export function CircleDetailPage() {
  const { circleId } = useParams<{ circleId: string }>();
  const { data: circle, isLoading } = useCircle(circleId!);

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!circle) return <div className="text-center py-12 text-slate-400">Circle not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{circle.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="primary">{circle.subject}</Badge>
            <span className="text-sm text-slate-400">{(circle as typeof circle & { _count?: { members: number } })._count?.members || 0} members</span>
          </div>
        </div>
      </div>

      <Tabs.Root defaultValue="chat" className="space-y-4">
        <Tabs.List className="flex gap-1 border-b border-slate-800" aria-label="Circle sections">
          {[
            { value: 'chat', icon: MessageSquare, label: 'Chat' },
            { value: 'tasks', icon: CheckSquare, label: 'Tasks' },
            { value: 'resources', icon: FileText, label: 'Resources' },
            { value: 'meetings', icon: Video, label: 'Meetings' },
            { value: 'members', icon: Users, label: 'Members' },
          ].map(({ value, icon: Icon, label }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-slate-200 data-[state=active]:border-primary-500 data-[state=active]:text-primary-400 transition-colors"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />{label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="chat"><ChatTab circleId={circleId!} /></Tabs.Content>
        <Tabs.Content value="tasks"><TasksTab circleId={circleId!} /></Tabs.Content>
        <Tabs.Content value="resources"><ResourcesTab circleId={circleId!} /></Tabs.Content>
        <Tabs.Content value="meetings"><MeetingsTab circleId={circleId!} /></Tabs.Content>
        <Tabs.Content value="members"><MembersTab circle={circle} /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function ChatTab({ circleId }: { circleId: string }) {
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const { data, isLoading } = useMessages(circleId);

  const allMessages = [
    ...(data?.pages.flatMap((p) => p.items) || []),
    ...localMessages,
  ];

  useEffect(() => {
    joinCircle(circleId);
    const socket = getSocket();

    socket.on('message:new', (msg: Message) => {
      if (msg.circleId === circleId) {
        setLocalMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    });

    socket.on('typing:start', ({ userId, username }: { userId: string; username: string }) => {
      if (userId !== user?.id) setTypingUsers((prev) => [...new Set([...prev, username])]);
    });
    socket.on('typing:stop', ({ userId }: { userId: string }) => {
      const socket_ = getSocket();
      socket_.emit('get_username', userId);
      setTypingUsers((prev) => prev.filter((u) => u !== userId));
    });

    messagesEndRef.current?.scrollIntoView();

    return () => {
      leaveCircle(circleId);
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, [circleId, user?.id]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage(circleId, message.trim());
    setMessage('');
    if (typingTimer.current) clearTimeout(typingTimer.current);
    stopTyping(circleId);
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    startTyping(circleId);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => stopTyping(circleId), 2000);
  };

  return (
    <div className="card flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-label="Chat messages" aria-live="polite">
        {isLoading ? <div className="flex justify-center py-4"><Spinner size="sm" /></div> : null}
        {allMessages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-3', msg.authorId === user?.id && 'flex-row-reverse')}>
            <Avatar src={(msg.author as { avatarUrl?: string } | undefined)?.avatarUrl} name={(msg.author as { displayName: string } | undefined)?.displayName || 'User'} size="sm" />
            <div className={cn('max-w-[70%] rounded-2xl px-4 py-2', msg.authorId === user?.id ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-100 rounded-tl-sm')}>
              {msg.authorId !== user?.id && <p className="text-xs font-medium text-primary-300 mb-1">{(msg.author as { displayName: string } | undefined)?.displayName}</p>}
              <p className="text-sm">{msg.content}</p>
              <p className="text-xs opacity-60 mt-1 text-right">{formatMessageTime(msg.createdAt)}</p>
            </div>
          </div>
        ))}
        {typingUsers.length > 0 && (
          <p className="text-xs text-slate-400 italic" aria-live="polite">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-slate-800 p-3 flex gap-2">
        <Input
          value={message}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="Type a message..."
          className="flex-1"
          aria-label="Message input"
        />
        <Button onClick={handleSend} disabled={!message.trim()} aria-label="Send message">
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function TasksTab({ circleId }: { circleId: string }) {
  const { data: tasks, isLoading } = useTasks(circleId);
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');

  const columns: Array<{ status: Task['status']; label: string }> = [
    { status: 'TODO', label: 'To Do' },
    { status: 'IN_PROGRESS', label: 'In Progress' },
    { status: 'DONE', label: 'Done' },
  ];

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createTask.mutateAsync({ circleId, title: title.trim() });
    setTitle('');
    setShowCreate(false);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)} leftIcon={<Plus className="h-4 w-4" />}>Add Task</Button>
      </div>
      {showCreate && (
        <div className="card p-4 flex gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title..." onKeyDown={(e) => e.key === 'Enter' && handleCreate()} autoFocus aria-label="New task title" />
          <Button size="sm" onClick={handleCreate} isLoading={createTask.isPending}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)} aria-label="Cancel"><X className="h-4 w-4" /></Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(({ status, label }) => (
          <div key={status} className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">{label} ({tasks?.filter((t) => t.status === status).length || 0})</h3>
            {tasks?.filter((t) => t.status === status).map((task) => (
              <div key={task.id} className="bg-slate-800 rounded-lg p-3 space-y-2">
                <p className="text-sm text-slate-100">{task.title}</p>
                <div className="flex gap-1 flex-wrap">
                  {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((s) => (
                    <button key={s} onClick={() => updateTask.mutate({ circleId, taskId: task.id, status: s })} className={cn('text-xs px-2 py-0.5 rounded transition-colors', s === task.status ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600')} aria-pressed={s === task.status}>
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!tasks?.filter((t) => t.status === status).length && (
              <p className="text-xs text-slate-600 text-center py-2">Empty</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourcesTab({ circleId }: { circleId: string }) {
  const { data: resources, isLoading } = useResources(circleId);
  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  return (
    <div className="space-y-3">
      {!resources?.length ? (
        <div className="card p-12 text-center"><FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" /><p className="text-slate-400">No resources yet</p></div>
      ) : (
        resources.map((r) => (
          <div key={r.id} className="card p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-medium text-slate-100">{r.title}</p>
              {r.description && <p className="text-sm text-slate-400">{r.description}</p>}
            </div>
            {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 text-sm">Open →</a>}
          </div>
        ))
      )}
    </div>
  );
}

function MeetingsTab({ circleId }: { circleId: string }) {
  return (
    <div className="card p-8 text-center">
      <Video className="h-12 w-12 text-primary-500 mx-auto mb-4" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-slate-100 mb-2">Video Meetings</h3>
      <p className="text-slate-400 mb-4">Start a video meeting with your circle using Jitsi</p>
      <a href={`https://meet.jit.si/skillshare-${circleId}`} target="_blank" rel="noopener noreferrer">
        <Button>Start Meeting</Button>
      </a>
    </div>
  );
}

function MembersTab({ circle }: { circle: { members?: Array<{ userId: string; role: string; user?: { id: string; displayName: string; avatarUrl?: string | null; level: number } }> } }) {
  return (
    <div className="space-y-3">
      {circle.members?.map((member) => (
        <div key={member.userId} className="card p-4 flex items-center gap-4">
          <Avatar src={member.user?.avatarUrl} name={member.user?.displayName || 'User'} size="md" />
          <div className="flex-1">
            <p className="font-medium text-slate-100">{member.user?.displayName}</p>
            <p className="text-sm text-slate-400">Level {member.user?.level}</p>
          </div>
          <Badge variant={member.role === 'ADMIN' ? 'primary' : 'gray'}>{member.role}</Badge>
        </div>
      ))}
    </div>
  );
}
