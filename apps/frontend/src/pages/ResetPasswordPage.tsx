import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { resetPasswordSchema, type ResetPasswordInput } from '@skillshare-circles/shared';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordInput) => { await api.post('/auth/reset-password', data); },
    onSuccess: () => { toast.success('Password reset! Please log in.'); navigate('/login'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-100">Reset Password</h1>
          <p className="mt-2 text-slate-400">Enter your new password</p>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="card p-8 space-y-6" noValidate>
          <input type="hidden" {...register('token')} />
          <Input {...register('password')} type="password" label="New Password" placeholder="••••••••" leftIcon={<Lock className="h-4 w-4" />} error={errors.password?.message} autoComplete="new-password" hint="8+ chars with uppercase, lowercase, number" />
          <Button type="submit" className="w-full" isLoading={mutation.isPending}>Reset Password</Button>
          <Link to="/login" className="block text-center text-sm text-slate-400 hover:text-slate-200">Back to login</Link>
        </form>
      </div>
    </div>
  );
}
