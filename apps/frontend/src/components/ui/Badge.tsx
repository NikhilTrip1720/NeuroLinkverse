import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'green' | 'red' | 'yellow' | 'gray';
  className?: string;
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  const variantClasses = {
    primary: 'badge-primary',
    green: 'badge-green',
    red: 'badge-red',
    yellow: 'badge-yellow',
    gray: 'badge-gray',
  };

  return (
    <span className={cn(variantClasses[variant], className)}>
      {children}
    </span>
  );
}
