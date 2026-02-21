import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock } from 'lucide-react';
import { loginSchema, type LoginInput } from '@skillshare-circles/shared';
import { useLogin } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const login = useLogin();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: LoginInput) => {
    await login.mutateAsync(data);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 mb-4">
            <BookOpen className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Welcome back</h1>
          <p className="mt-2 text-slate-400">Sign in to your Skillshare Circles account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-8 space-y-6" noValidate>
          <Input
            {...register('email')}
            type="email"
            label="Email address"
            placeholder="you@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            autoComplete="email"
          />
          <div className="space-y-1">
            <Input
              {...register('password')}
              type="password"
              label="Password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              autoComplete="current-password"
            />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full" isLoading={login.isPending}>
            Sign In
          </Button>

          <p className="text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
