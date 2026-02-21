import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function Spinner({ size = 'md', className, label = 'Loading...' }: SpinnerProps) {
  return (
    <div role="status" className="flex items-center justify-center">
      <Loader2
        className={cn('animate-spin text-primary-500', sizeClasses[size], className)}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="text-center space-y-4">
        <Spinner size="lg" />
        <p className="text-slate-400 text-sm">Loading Skillshare Circles...</p>
      </div>
    </div>
  );
}
