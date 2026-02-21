import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@skillshare-circles/shared';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';
import { useState } from 'react';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordInput) => {
      await api.post('/auth/forgot-password', data);
    },
    onSuccess: () => setSent(true),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md w-full">
          <Mail className="h-12 w-12 text-primary-400 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-xl font-bold text-slate-100 mb-2">Check your email</h1>
          <p className="text-slate-400 mb-4">If an account exists, we've sent a password reset link.</p>
          <Link to="/login" className="text-primary-400 hover:text-primary-300">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-100">Forgot password?</h1>
          <p className="mt-2 text-slate-400">Enter your email to receive a reset link</p>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="card p-8 space-y-6" noValidate>
          <Input {...register('email')} type="email" label="Email address" placeholder="you@example.com" leftIcon={<Mail className="h-4 w-4" />} error={errors.email?.message} autoComplete="email" />
          <Button type="submit" className="w-full" isLoading={mutation.isPending}>Send Reset Link</Button>
          <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to login
          </Link>
        </form>
      </div>
    </div>
  );
}
