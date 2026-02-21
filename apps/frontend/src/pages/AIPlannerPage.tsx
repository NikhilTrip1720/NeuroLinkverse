import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles, BookOpen } from 'lucide-react';
import { studyPlanRequestSchema, type StudyPlanRequestInput } from '@skillshare-circles/shared';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/lib/utils';
import toast from 'react-hot-toast';

export function AIPlannerPage() {
  const [plan, setPlan] = useState<{ title: string; content: { overview: string; weeks: Array<{ week: number; title: string; topics: string[] }>; resources: string[]; milestones: string[] } } | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<StudyPlanRequestInput>({
    resolver: zodResolver(studyPlanRequestSchema),
    defaultValues: { duration: '1_month', level: 'beginner' },
  });

  const generate = useMutation({
    mutationFn: async (data: StudyPlanRequestInput) => {
      const res = await api.post('/ai/study-plan', data);
      return res.data.data;
    },
    onSuccess: (data) => { setPlan(data); toast.success('Study plan generated!'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary-400" aria-hidden="true" />
          AI Study Planner
        </h1>
        <p className="text-slate-400 mt-1">Generate a personalized study plan with AI</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit((d) => generate.mutate(d))} className="card p-6 space-y-4">
          <Input {...register('subject')} label="Subject" placeholder="React, Machine Learning..." error={errors.subject?.message} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Duration</label>
            <select {...register('duration')} className="input">
              <option value="1_week">1 Week</option>
              <option value="2_weeks">2 Weeks</option>
              <option value="1_month">1 Month</option>
              <option value="3_months">3 Months</option>
              <option value="6_months">6 Months</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Level</label>
            <select {...register('level')} className="input">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <Textarea {...register('goals')} label="Goals (optional)" placeholder="What do you want to achieve?" rows={3} />
          <Button type="submit" className="w-full" isLoading={generate.isPending} leftIcon={<Sparkles className="h-4 w-4" />}>
            Generate Plan
          </Button>
        </form>

        {plan ? (
          <div className="card p-6 space-y-4 overflow-y-auto max-h-[600px]">
            <h2 className="font-semibold text-slate-100 flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary-400" aria-hidden="true" />{plan.title}</h2>
            <p className="text-sm text-slate-300">{plan.content.overview}</p>
            <div className="space-y-3">
              {plan.content.weeks?.slice(0, 4).map((week) => (
                <div key={week.week} className="bg-slate-800 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-primary-300">{week.title}</h4>
                  <ul className="mt-1 space-y-0.5">
                    {week.topics?.map((topic, i) => <li key={i} className="text-xs text-slate-400">• {topic}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card p-8 flex items-center justify-center text-center">
            <div>
              <Sparkles className="h-12 w-12 text-slate-600 mx-auto mb-4" aria-hidden="true" />
              <p className="text-slate-400">Your AI-generated study plan will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
