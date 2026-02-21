import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, User, AtSign } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@skillshare-circles/shared';
import { useRegister } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const navigate = useNavigate();
  const register_ = useRegister();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    await register_.mutateAsync(data);
    toast.success('Account created! Please check your email to verify your account.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 mb-4">
            <BookOpen className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Create account</h1>
          <p className="mt-2 text-slate-400">Join thousands of learners worldwide</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-8 space-y-4" noValidate>
          <Input
            {...register('email')}
            type="email"
            label="Email address"
            placeholder="you@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            autoComplete="email"
          />
          <Input
            {...register('username')}
            label="Username"
            placeholder="coollearner"
            leftIcon={<AtSign className="h-4 w-4" />}
            error={errors.username?.message}
            hint="3-30 characters, letters, numbers, underscores, hyphens"
            autoComplete="username"
          />
          <Input
            {...register('displayName')}
            label="Display name"
            placeholder="Your Name"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.displayName?.message}
            autoComplete="name"
          />
          <Input
            {...register('password')}
            type="password"
            label="Password"
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            hint="8+ characters with uppercase, lowercase, and number"
            autoComplete="new-password"
          />

          <Button type="submit" className="w-full mt-2" isLoading={register_.isPending}>
            Create Account
          </Button>

          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
