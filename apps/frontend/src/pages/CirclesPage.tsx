import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Users, Lock, Globe } from 'lucide-react';
import { useMyCircles, useDiscoverCircles, useCreateCircle, useJoinCircle } from '@/hooks/useCircles';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { truncate } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCircleSchema, type CreateCircleInput } from '@skillshare-circles/shared';
import { Textarea } from '@/components/ui/Textarea';

export function CirclesPage() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'my' | 'discover'>('my');
  const [showCreate, setShowCreate] = useState(false);

  const { data: myCircles, isLoading: myLoading } = useMyCircles();
  const { data: discoverData, isLoading: discoverLoading } = useDiscoverCircles(search);
  const createCircle = useCreateCircle();
  const joinCircle = useJoinCircle();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateCircleInput>({
    resolver: zodResolver(createCircleSchema),
    defaultValues: { isPrivate: false, maxMembers: 20 },
  });

  const onCreateCircle = async (data: CreateCircleInput) => {
    await createCircle.mutateAsync(data);
    setShowCreate(false);
    reset();
  };

  const discoverItems = (discoverData as { items?: unknown[] })?.items || (Array.isArray(discoverData) ? discoverData : []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Study Circles</h1>
          <p className="text-slate-400 mt-1">Collaborate and learn together</p>
        </div>
        <Button onClick={() => setShowCreate(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Create Circle
        </Button>
      </div>

      <div className="flex gap-2 border-b border-slate-800">
        {(['my', 'discover'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            aria-selected={tab === t}
            role="tab"
          >
            {t === 'my' ? 'My Circles' : 'Discover'}
          </button>
        ))}
      </div>

      {tab === 'discover' && (
        <Input
          placeholder="Search circles by name, subject..."
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search circles"
        />
      )}

      {tab === 'my' ? (
        myLoading ? <div className="flex justify-center py-12"><Spinner /></div> :
        !myCircles?.length ? (
          <div className="card p-12 text-center">
            <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" aria-hidden="true" />
            <p className="text-slate-400">You haven't joined any circles yet.</p>
            <button onClick={() => setTab('discover')} className="text-primary-400 hover:text-primary-300 text-sm mt-2">
              Discover circles →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCircles.map((circle) => <CircleCard key={circle.id} circle={circle} isMember />)}
          </div>
        )
      ) : (
        discoverLoading ? <div className="flex justify-center py-12"><Spinner /></div> :
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {discoverItems.map((circle) => {
            const c = circle as { id: string };
            const myIds = new Set(myCircles?.map((m) => m.id));
            return <CircleCard key={c.id} circle={c as Parameters<typeof CircleCard>[0]['circle']} isMember={myIds.has(c.id)} onJoin={() => joinCircle.mutate({ circleId: c.id })} />;
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Study Circle" size="lg">
        <form onSubmit={handleSubmit(onCreateCircle)} className="space-y-4">
          <Input {...register('name')} label="Circle Name" placeholder="Advanced React Patterns" error={errors.name?.message} />
          <Textarea {...register('description')} label="Description" placeholder="What will you study together?" rows={3} error={errors.description?.message} />
          <Input {...register('subject')} label="Subject" placeholder="React, Python, Mathematics..." error={errors.subject?.message} />
          <div className="flex gap-4">
            <Input {...register('maxMembers', { valueAsNumber: true })} type="number" label="Max Members" min={2} max={100} error={errors.maxMembers?.message} className="flex-1" />
            <div className="flex items-center gap-2 mt-7">
              <input {...register('isPrivate')} type="checkbox" id="isPrivate" className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-primary-600" />
              <label htmlFor="isPrivate" className="text-sm text-slate-300">Private circle</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" isLoading={createCircle.isPending}>Create Circle</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function CircleCard({ circle, isMember, onJoin }: { circle: { id: string; name: string; description: string; subject: string; isPrivate?: boolean; _count?: { members: number } }; isMember?: boolean; onJoin?: () => void }) {
  return (
    <div className="card-hover p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-100 truncate">{circle.name}</h3>
          <Badge variant="primary" className="mt-1">{circle.subject}</Badge>
        </div>
        {circle.isPrivate ? <Lock className="h-4 w-4 text-slate-500 ml-2 flex-shrink-0" aria-label="Private circle" /> : <Globe className="h-4 w-4 text-slate-500 ml-2 flex-shrink-0" aria-label="Public circle" />}
      </div>
      <p className="text-sm text-slate-400 flex-1 mb-3">{truncate(circle.description, 100)}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Users className="h-3 w-3" aria-hidden="true" />
          {circle._count?.members || 0} members
        </span>
        {isMember ? (
          <Link to={`/circles/${circle.id}`} className="btn-primary btn text-xs h-8 px-3">Open</Link>
        ) : (
          <Button size="sm" onClick={onJoin}>Join</Button>
        )}
      </div>
    </div>
  );
}
